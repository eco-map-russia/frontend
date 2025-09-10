import { useState } from 'react';
import AdminPanelButton from './AdminPanelButton';
import AdminPanelModal from '../admin/AdminPanelModal';

function AdminPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className={'admin-panel'}>
      <AdminPanelButton onClickAdminPanelButton={() => setOpen(true)} />
      <AdminPanelModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default AdminPanel;
