import React from 'react';
import { useNavigate } from 'react-router-dom';

import AuthShell from '../../../../components/V2/AuthShell';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';

/** Reset-password success — landing after a completed password reset. */
export default function ResetPasswordSuccessPage() {
  const navigate = useNavigate();
  return (
    <AuthShell
      title="PASSWORD UPDATED"
      subtitle="YOUR NEW PASSWORD IS ACTIVE"
    >
      <div className="flex flex-col gap-5 items-center text-center">
        <HudText variant="bodySmall" color="light">
          Your password has been reset. Sign in with your new credentials.
        </HudText>
        <HudButton
          variant="primary"
          fullWidth
          onClick={() => navigate('/identity/login', { replace: true })}
        >
          SIGN IN
        </HudButton>
      </div>
    </AuthShell>
  );
}
