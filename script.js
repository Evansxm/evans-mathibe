document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  if (!form || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    submit.disabled = true;
    status.textContent = 'Saving your message…';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please check the form and try again.');
      status.textContent = 'Your message is saved. Opening your email app to complete the send.';
      form.reset();
      window.location.href = result.mailto;
    } catch (error) {
      status.textContent = `${error.message} You can also email evans.mathibe@mail.com directly.`;
      submit.disabled = false;
    }
  });
});
