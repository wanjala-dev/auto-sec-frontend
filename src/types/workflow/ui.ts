export interface WorkflowTeamReference {
  id?: string | number;
  title?: string;
  name?: string;
  label?: string;
  [key: string]: unknown;
}

export interface WorkflowDirectoryMember {
  id?: string | number;
  memberId?: string | number;
  email?: string;
  username?: string;
  name?: string;
  initials?: string;
  avatar?: string;
  role?: string;
  location?: string;
  teams?: Array<string | WorkflowTeamReference>;
  [key: string]: unknown;
}

export interface WorkflowInvitationTeam {
  id?: string | number;
  invitationId?: string | number;
  code?: string;
  title: string;
  dateSent?: string;
}

export interface WorkflowInvitation {
  id: string | number;
  name: string;
  email: string;
  initials: string;
  avatar?: string;
  teamCount: number;
  latestSent?: string;
  teams: WorkflowInvitationTeam[];
}

export interface WorkflowPermission {
  key: string;
  label: string;
  description?: string;
}

export type MemberPermissions = Record<string, boolean>;
export type PermissionsByMember = Record<string, MemberPermissions>;
