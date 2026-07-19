import React, { useCallback, useEffect, useState } from 'react';
import { FiUser, FiMail, FiBriefcase, FiMapPin, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../../components/V2/HudCard';
import HudButton from '../../../../components/V2/HudButton';
import HudText from '../../../../components/V2/HudText';
import HudInput from '../../../../components/V2/HudInput';
import HexLoader from '../../../../components/V2/HexLoader';
import apiClient from '../../../../infrastructure/http/apiClient';

/**
 * ProfileSection — Settings ▸ Profile: edit identity (name / title / city) and
 * change password. Reads /identity/me/summary; writes /identity/edit/<id>/ +
 * /identity/profile/<id>/ + /identity/changepassword/.
 */
export default function ProfileSection() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/identity/me/summary/');
      const u = res?.data?.data?.user ?? res?.data?.user ?? {};
      const p = u.profile || {};
      setUserId(u.id);
      setEmail(u.email || '');
      setFirstName(u.first_name || '');
      setLastName(u.last_name || '');
      setTitle(p.title || '');
      setCity(p.city || '');
    } catch {
      toast.error('Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    try {
      await apiClient.patch(`/identity/edit/${userId}/`, {
        first_name: firstName,
        last_name: lastName
      });
      await apiClient
        .patch(`/identity/profile/${userId}/`, { title, city })
        .catch(() => {}); // profile row may be optional; name is the essential save
      toast.success('Profile updated.');
    } catch {
      toast.error('Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await apiClient.patch('/identity/changepassword/', {
        old_password: oldPw,
        new_password: newPw,
        confirm_password: newPw
      });
      toast.success('Password changed.');
      setOldPw('');
      setNewPw('');
    } catch (err) {
      setPwError(
        err?.response?.data?.old_password?.[0] ||
          err?.response?.data?.detail ||
          'Could not change password. Check your current password.'
      );
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <HexLoader size={56} label="LOADING PROFILE…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Identity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FiUser className="text-hud-accent" size={16} />
          <HudText variant="heading" color="light">
            PROFILE
          </HudText>
        </div>
        <HudCard bodyClassName="p-5">
          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-hud-surface/20 border border-hud-line/[0.04]">
              <FiMail size={14} className="text-hud-dim" />
              <span className="text-[12px] font-mono text-hud-dim">
                {email}
              </span>
              <span className="ml-auto text-[7px] font-mono text-hud-dim tracking-wider">
                READ-ONLY
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HudInput
                icon={<FiUser size={14} />}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <HudInput
                icon={<FiUser size={14} />}
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <HudInput
              icon={<FiBriefcase size={14} />}
              placeholder="Title (e.g. SOC Analyst)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <HudInput
              icon={<FiMapPin size={14} />}
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <div>
              <HudButton
                variant="primary"
                type="submit"
                disabled={savingProfile}
              >
                {savingProfile ? 'SAVING…' : 'SAVE PROFILE'}
              </HudButton>
            </div>
          </form>
        </HudCard>
      </div>

      {/* Change password */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FiLock className="text-hud-accent" size={16} />
          <HudText variant="heading" color="light">
            CHANGE PASSWORD
          </HudText>
        </div>
        <HudCard bodyClassName="p-5">
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <HudInput
              icon={<FiLock size={14} />}
              type="password"
              placeholder="Current password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => {
                setOldPw(e.target.value);
                if (pwError) setPwError('');
              }}
            />
            <HudInput
              icon={<FiLock size={14} />}
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value);
                if (pwError) setPwError('');
              }}
              error={pwError}
            />
            <div>
              <HudButton variant="secondary" type="submit" disabled={savingPw}>
                {savingPw ? 'UPDATING…' : 'CHANGE PASSWORD'}
              </HudButton>
            </div>
          </form>
        </HudCard>
      </div>
    </div>
  );
}
