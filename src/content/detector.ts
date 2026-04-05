export type ATSPlatform = 'greenhouse' | 'lever' | 'unknown';

export function detectPlatform(): ATSPlatform {
  const hostname = window.location.hostname;
  const url = window.location.href;

  // 1. URL-based detection
  if (hostname.includes('greenhouse.io')) return 'greenhouse';
  if (hostname.includes('jobs.lever.co') || hostname.includes('lever.co')) return 'lever';

  // 2. DOM-based detection for embedded Greenhouse forms (e.g. stripe.com/jobs)
  if (
    document.querySelector('#application_form') ||
    document.querySelector('form[action*="greenhouse"]') ||
    document.querySelector('input[name*="job_application"]') ||
    document.querySelector('[data-mapped="true"]') ||
    document.querySelector('.application--header') ||
    document.querySelector('#grnhse_app') ||
    url.includes('/jobs/') && document.querySelector('form input[name="first_name"], form input[name="last_name"]')
  ) {
    return 'greenhouse';
  }

  // 3. DOM-based detection for embedded Lever forms
  if (
    document.querySelector('.posting-page') ||
    document.querySelector('[data-qa="posting-name"]') ||
    document.querySelector('form.posting-form')
  ) {
    return 'lever';
  }

  // 4. Generic job form detection — treat as greenhouse (most common)
  const hasJobForm = document.querySelector('form') &&
    document.querySelector('input[name*="name"], label') &&
    (url.includes('/apply') || url.includes('/application') || url.includes('/careers'));
  if (hasJobForm) return 'greenhouse';

  return 'unknown';
}
