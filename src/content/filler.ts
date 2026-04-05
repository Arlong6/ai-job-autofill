export function fillTextField(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): boolean {
  try {
    element.focus();

    // Use native setter to work with React controlled inputs
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Dispatch events that frameworks listen for
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    return true;
  } catch {
    return false;
  }
}

export function fillDropdown(
  selectElement: HTMLSelectElement,
  targetValue: string
): boolean {
  try {
    const normalizedTarget = targetValue.toLowerCase().trim();

    // Use native setter for React compatibility
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;

    const setValue = (option: HTMLOptionElement) => {
      if (nativeSetter) {
        nativeSetter.call(selectElement, option.value);
      } else {
        selectElement.value = option.value;
      }
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    // 1. Try exact match on text or value
    for (const option of selectElement.options) {
      const optText = option.textContent?.toLowerCase().trim() || '';
      const optVal = option.value.toLowerCase().trim();
      if (optText === normalizedTarget || optVal === normalizedTarget) {
        return setValue(option);
      }
    }

    // 2. Try substring/includes match (require minimum 4 chars to avoid false positives)
    if (normalizedTarget.length >= 4) {
      for (const option of selectElement.options) {
        const optText = option.textContent?.toLowerCase().trim() || '';
        if (optText.length >= 4 && (optText.includes(normalizedTarget) || normalizedTarget.includes(optText))) {
          return setValue(option);
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function fillRadio(container: HTMLElement, targetValue: string): boolean {
  const radios = container.querySelectorAll('input[type="radio"]');
  const normalizedTarget = targetValue.toLowerCase().trim();
  for (const radio of radios) {
    const r = radio as HTMLInputElement;
    const label = r.closest('label') || document.querySelector(`label[for="${r.id}"]`);
    const labelText = label?.textContent?.trim().toLowerCase() || '';
    if (labelText.includes(normalizedTarget) || r.value.toLowerCase() === normalizedTarget) {
      r.click();
      r.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

export function fillCheckbox(container: HTMLElement, targetValue: string): boolean {
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  const normalizedTarget = targetValue.toLowerCase().trim();
  const shouldCheck = !['no', 'false', '0', 'unchecked'].includes(normalizedTarget);
  for (const checkbox of checkboxes) {
    const cb = checkbox as HTMLInputElement;
    const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
    const labelText = label?.textContent?.trim().toLowerCase() || '';
    if (labelText.includes(normalizedTarget) || cb.value.toLowerCase() === normalizedTarget || checkboxes.length === 1) {
      if (cb.checked !== shouldCheck) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }
  }
  return false;
}

export async function fillCustomDropdown(
  container: HTMLElement,
  targetValue: string
): Promise<boolean> {
  try {
    // Click to open the dropdown — try various trigger patterns
    const trigger = container.querySelector(
      '[class*="select__control"], [class*="Select-control"], button, [role="combobox"], .select-trigger, [class*="indicator"]'
    ) as HTMLElement | null;
    if (trigger) trigger.click();
    else container.click();

    // Wait for dropdown to open (React Select needs a moment)
    await new Promise((resolve) => setTimeout(resolve, 400));

    const normalizedTarget = targetValue.toLowerCase().trim();

    // Search both inside container AND in document body (React portals)
    const searchRoots = [container, document.body];
    for (const root of searchRoots) {
      const options = root.querySelectorAll(
        '[role="option"], [class*="select__option"], [class*="option"], li[id*="option"]'
      );

      // First pass: exact match
      for (const option of options) {
        const text = option.textContent?.toLowerCase().trim() || '';
        if (text === normalizedTarget) {
          (option as HTMLElement).click();
          return true;
        }
      }

      // Second pass: includes match (min 4 chars)
      if (normalizedTarget.length >= 4) {
        for (const option of options) {
          const text = option.textContent?.toLowerCase().trim() || '';
          if (text.includes(normalizedTarget) || normalizedTarget.includes(text)) {
            (option as HTMLElement).click();
            return true;
          }
        }
      }
    }

    // Close dropdown if nothing matched (press Escape)
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  } catch {
    return false;
  }
}
