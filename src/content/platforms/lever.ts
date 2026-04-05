import type { PlatformAdapter, DetectedField, FieldType } from './types';
import { fillTextField, fillDropdown } from '../filler';

export class LeverAdapter implements PlatformAdapter {
  formSelector = '.application-form, .postings-btn-wrapper';

  extractJobTitle(): string {
    const el = document.querySelector('.posting-headline h2') ||
               document.querySelector('h2');
    return el?.textContent?.trim() || '';
  }

  extractCompany(): string {
    const el = document.querySelector('.posting-categories .sort-by-team') ||
               document.querySelector('.main-header-logo img');
    if (el instanceof HTMLImageElement) return el.alt || '';
    // Fallback: extract from document title ("Job Title - Company")
    if (el?.textContent?.trim()) return el.textContent.trim();
    const titleParts = document.title.split(' - ');
    return titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : '';
  }

  extractJobDescription(): string {
    const sections = document.querySelectorAll('.section-wrapper .section');
    let desc = '';
    for (const section of sections) {
      desc += section.textContent?.trim() + '\n\n';
    }
    if (!desc.trim()) {
      const content = document.querySelector('.content') || document.querySelector('.posting-page');
      desc = content?.textContent?.trim() || '';
    }
    return desc.slice(0, 20000);
  }

  scanFields(): DetectedField[] {
    const form = document.querySelector('.application-form') ||
                 document.querySelector('form');
    if (!form) return [];

    const fields: DetectedField[] = [];

    // Lever uses a different structure: .application-question groups
    const questions = form.querySelectorAll('.application-question');

    for (const question of questions) {
      const labelEl = question.querySelector('label') || question.querySelector('.application-label');
      const labelText = labelEl?.textContent?.trim().replace(/\s*\*\s*$/, '') || '';
      if (!labelText) continue;

      const input = question.querySelector('input, select, textarea') as HTMLElement | null;
      if (!input) continue;

      const tagName = input.tagName.toLowerCase();
      const inputType = (input as HTMLInputElement).type?.toLowerCase() || '';
      let fieldType: FieldType = 'text';

      if (tagName === 'select') fieldType = 'select';
      else if (tagName === 'textarea') fieldType = 'textarea';
      else if (inputType === 'checkbox') fieldType = 'checkbox';
      else if (inputType === 'radio') fieldType = 'radio';
      else if (inputType === 'file') fieldType = 'file';

      const required = input.hasAttribute('required') ||
                       labelEl?.textContent?.includes('*') || false;

      let selector = '';
      if (input.id) {
        selector = `#${CSS.escape(input.id)}`;
      } else if (input.getAttribute('name')) {
        selector = `[name="${CSS.escape(input.getAttribute('name')!)}"]`;
      }
      if (!selector) continue;

      const options: string[] = [];
      if (fieldType === 'select') {
        const selectEl = input as HTMLSelectElement;
        for (const opt of selectEl.options) {
          if (opt.value) options.push(opt.textContent?.trim() || opt.value);
        }
      }

      fields.push({
        selector,
        label: labelText,
        type: fieldType,
        required,
        ...(options.length > 0 && { options }),
      });
    }

    // Fallback: scan standard labels if no .application-question found
    if (fields.length === 0) {
      const labels = form.querySelectorAll('label');
      for (const label of labels) {
        const forAttr = label.getAttribute('for');
        let input: HTMLElement | null = null;
        if (forAttr) input = form.querySelector(`#${CSS.escape(forAttr)}`);
        if (!input) input = label.parentElement?.querySelector('input, select, textarea') || null;
        if (!input) continue;

        const labelText = label.textContent?.trim().replace(/\s*\*\s*$/, '') || '';
        if (!labelText) continue;

        const tagName = input.tagName.toLowerCase();
        const inputType = (input as HTMLInputElement).type?.toLowerCase() || '';
        let fieldType: FieldType = 'text';
        if (tagName === 'select') fieldType = 'select';
        else if (tagName === 'textarea') fieldType = 'textarea';
        else if (inputType === 'file') fieldType = 'file';

        let selector = '';
        if (input.id) selector = `#${CSS.escape(input.id)}`;
        else if (input.getAttribute('name')) selector = `[name="${CSS.escape(input.getAttribute('name')!)}"]`;
        if (!selector) continue;

        fields.push({
          selector,
          label: labelText,
          type: fieldType,
          required: input.hasAttribute('required') || label.textContent?.includes('*') || false,
        });
      }
    }

    return fields;
  }

  fillField(selector: string, value: string, type: FieldType): boolean {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;

    switch (type) {
      case 'text':
      case 'textarea':
        return fillTextField(el as HTMLInputElement | HTMLTextAreaElement, value);
      case 'select':
        return fillDropdown(el as HTMLSelectElement, value);
      default:
        return false;
    }
  }
}
