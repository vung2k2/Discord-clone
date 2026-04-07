'use client';

import { CreateServerModal } from '../modals/create-server-modal';
import InviteModal from '../modals/Invite-modal';

export function ModalProvider() {
  return (
    <>
      <CreateServerModal />
      <InviteModal />
      {/* <EditServerModal /> */}
    </>
  );
}
