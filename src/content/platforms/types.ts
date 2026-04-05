export type FieldType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'custom-dropdown';

export interface DetectedField {
  selector: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface PlatformAdapter {
  formSelector: string;
  extractJobTitle(): string;
  extractCompany(): string;
  extractJobDescription(): string;
  scanFields(): DetectedField[];
  fillField(selector: string, value: string, type: FieldType): boolean;
}
