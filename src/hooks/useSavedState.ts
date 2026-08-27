import { useEffect, useState } from 'react';

// Drives the "Save X" -> "X Saved" button label: call markSaved() right
// after a successful save, and it flips back to false automatically as
// soon as the form's dirty state goes true again (i.e. any further edit).
export function useSavedState(isDirty: boolean) {
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (isDirty) setJustSaved(false);
  }, [isDirty]);

  return [justSaved, setJustSaved] as const;
}
