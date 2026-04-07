'use client';

import { CreateChannelModal } from '../modals/create-channel-modal';
import { CreateServerModal } from '../modals/create-server-modal';
import { EditServerModal } from '../modals/edit-server-modal';
import InviteModal from '../modals/Invite-modal';
import MemberModal from '../modals/members-modal';

export function ModalProvider() {
  return (
    <>
      <CreateServerModal />
      <InviteModal />
      <EditServerModal />
      <MemberModal />
      <CreateChannelModal />
    </>
  );
}
