import AdminPanelButton from './AdminPanelButton';

function AdminPanel() {
  return (
    <div className={'admin-panel'}>
      <AdminPanelButton
        onClickAdminPanelButton={() => {
          console.log('Admin Panel Button Clicked');
        }}
      />
    </div>
  );
}

export default AdminPanel;
