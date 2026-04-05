import type { PlatformAdapter, DetectedField, FieldType } from './types';
import { fillTextField, fillDropdown } from '../filler';

export class GreenhouseAdapter implements PlatformAdapter {
  formSelector = '#application_form, #application, form[action*="applications"], form';

  extractJobTitle(): string {
    const el = document.querySelector('h1.app-title') ||
               document.querySelector('.app-title') ||
               document.querySelector('h1') ||
               document.querySelector('[data-mapped="true"] h1');
    return el?.textContent?.trim() || '';
  }

  extractCompany(): string {
    const el = document.querySelector('.company-name') ||
               document.querySelector('meta[property="og:site_name"]');
    if (el instanceof HTMLMetaElement) return el.content || '';
    return el?.textContent?.trim() || document.title.split(' - ').pop()?.trim() || '';
  }

  extractJobDescription(): string {
    const el = document.querySelector('#content') ||
               document.querySelector('.job-post-content') ||
               document.querySelector('[data-qa="job-description"]') ||
               document.querySelector('.job_description') ||
               document.querySelector('.content');
    return el?.textContent?.trim().slice(0, 20000) || '';
  }

  private findForm(): HTMLElement | null {
    // Try multiple selectors for Greenhouse forms
    const selectors = [
      '#application_form',
      '#application',
      'form[action*="applications"]',
      'form[method="post"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el as HTMLElement;
    }
    // Fallback: find a form that contains typical application fields
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const hasNameField = form.querySelector('input[name*="name"], input[name*="first"], label');
      if (hasNameField) return form as HTMLElement;
    }
    return document.body;
  }

  scanFields(): DetectedField[] {
    const form = this.findForm();
    if (!form) return [];

    const fields: DetectedField[] = [];

    // Strategy 1: Find all input/select/textarea elements with labels
    const inputs = form.querySelectorAll('input, select, textarea');

    for (const input of inputs) {
      const el = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const inputType = (el as HTMLInputElement).type?.toLowerCase() || '';

      // Skip hidden, submit, button inputs
      if (['hidden', 'submit', 'button', 'reset'].includes(inputType)) continue;
      if (el.tagName === 'INPUT' && inputType === '' && !el.getAttribute('name')) continue;

      // Find label
      let labelText = '';

      // Method 1: label[for] matching input id
      if (el.id) {
        const label = form.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) labelText = label.textContent?.trim() || '';
      }

      // Method 2: aria-label
      if (!labelText) {
        labelText = el.getAttribute('aria-label') || '';
      }

      // Method 3: placeholder
      if (!labelText) {
        labelText = el.getAttribute('placeholder') || '';
      }

      // Method 4: closest parent with label
      if (!labelText) {
        const parent = el.closest('.field, .form-group, .form-field, .application-field, div[class*="field"]');
        if (parent) {
          const label = parent.querySelector('label, .label, .field-label, span[class*="label"]');
          if (label) labelText = label.textContent?.trim() || '';
        }
      }

      // Method 5: previous sibling label
      if (!labelText) {
        const prev = el.previousElementSibling;
        if (prev?.tagName === 'LABEL') labelText = prev.textContent?.trim() || '';
      }

      // Method 6: name attribute as fallback
      if (!labelText) {
        const name = el.getAttribute('name') || '';
        labelText = name.replace(/[_\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      }

      // Clean label: remove asterisks and "required" text
      labelText = labelText.replace(/\s*\*\s*/g, '').replace(/\(required\)/i, '').trim();

      if (!labelText) continue;

      // Determine field type
      const tagName = el.tagName.toLowerCase();
      let fieldType: FieldType = 'text';

      if (tagName === 'select') fieldType = 'select';
      else if (tagName === 'textarea') fieldType = 'textarea';
      else if (inputType === 'email') fieldType = 'email';
      else if (inputType === 'tel') fieldType = 'tel';
      else if (inputType === 'url') fieldType = 'url';
      else if (inputType === 'checkbox') fieldType = 'checkbox';
      else if (inputType === 'radio') fieldType = 'radio';
      else if (inputType === 'file') fieldType = 'file';
      else if (inputType === 'date') fieldType = 'date';

      // Build selector
      let selector = '';
      if (el.id) {
        selector = `#${CSS.escape(el.id)}`;
      } else if (el.getAttribute('name')) {
        selector = `${tagName}[name="${CSS.escape(el.getAttribute('name')!)}"]`;
      } else {
        // Use nth-of-type with tag + parent
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll(tagName));
          const idx = siblings.indexOf(el);
          selector = `${tagName}:nth-of-type(${idx + 1})`;
        }
      }

      if (!selector) continue;

      // Check required
      const required = el.hasAttribute('required') ||
                       el.getAttribute('aria-required') === 'true';

      // Get options for select
      const options: string[] = [];
      if (fieldType === 'select') {
        for (const opt of (el as HTMLSelectElement).options) {
          if (opt.value && opt.value !== '') options.push(opt.textContent?.trim() || opt.value);
        }
      }

      // Avoid duplicates
      if (fields.some(f => f.selector === selector)) continue;

      fields.push({
        selector,
        label: labelText,
        type: fieldType,
        required,
        ...(options.length > 0 && { options }),
      });
    }

    // Strategy 2: Detect custom dropdowns (React Select, etc.)
    const customDropdowns = form.querySelectorAll(
      '[class*="select__control"], [class*="Select-control"], [data-testid*="select"], div[class*="select-container"]'
    );

    for (const dropdown of customDropdowns) {
      const container = dropdown.closest('[class*="select__container"], [class*="field"], .field, div[class*="select"]') || dropdown.parentElement;
      if (!container) continue;

      // Find label for this custom dropdown
      let labelText = '';
      const parentField = container.closest('.field, .form-group, .form-field, div[class*="field"]');
      if (parentField) {
        const label = parentField.querySelector('label, .label, .field-label, legend');
        if (label) labelText = label.textContent?.trim() || '';
      }
      if (!labelText) {
        const prev = container.previousElementSibling;
        if (prev?.tagName === 'LABEL' || prev?.tagName === 'LEGEND') {
          labelText = prev.textContent?.trim() || '';
        }
      }
      if (!labelText) {
        // Check aria-label on the input inside
        const input = container.querySelector('input');
        if (input) labelText = input.getAttribute('aria-label') || input.getAttribute('placeholder') || '';
      }

      labelText = labelText.replace(/\s*\*\s*/g, '').replace(/\(required\)/i, '').trim();
      if (!labelText) continue;

      // Build a unique selector
      let selector = '';
      const parentWithId = container.closest('[id]');
      if (parentWithId?.id) {
        selector = `#${CSS.escape(parentWithId.id)}`;
      } else if (parentField) {
        const allFields = Array.from(form.querySelectorAll('.field, .form-group, .form-field, div[class*="field"]'));
        const idx = allFields.indexOf(parentField);
        if (idx >= 0) selector = `.field:nth-of-type(${idx + 1})`;
      }
      if (!selector) {
        // Use the container itself
        const dd = dropdown as HTMLElement;
        if (dd.className) {
          const cls = dd.className.split(' ')[0];
          selector = `.${CSS.escape(cls)}`;
        }
      }
      if (!selector) continue;

      // Avoid duplicates
      if (fields.some(f => f.label === labelText || f.selector === selector)) continue;

      fields.push({
        selector,
        label: labelText,
        type: 'custom-dropdown',
        required: parentField?.querySelector('[aria-required="true"], .required')
          ? true
          : labelText.includes('*') || (parentField?.textContent?.includes('*') ?? false),
      });
    }

    return fields;
  }

  fillField(selector: string, value: string, type: FieldType): boolean {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;

    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'textarea':
        return fillTextField(el as HTMLInputElement | HTMLTextAreaElement, value);
      case 'select':
        return fillDropdown(el as HTMLSelectElement, value);
      default:
        return false;
    }
  }
}
