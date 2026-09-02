import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Store
} from "lucide-react";

function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutDashboard
    },
    {
      id: "inventory",
      name: "Inventory",
      icon: Package
    },
    {
      id: "add-product",
      name: "Add Product",
      icon: PlusCircle
    },
    {
      id: "sales",
      name: "Sales",
      icon: ShoppingCart
    },
    {
      id: "reports",
      name: "Reports",
      icon: BarChart3
    }
  ];

  return (
    <aside className="sidebar">

      <div className="brand">
        <div className="brand-icon">
          <Store size={24} />
        </div>

        <div>
          <h1>EM-PLUGS</h1>
          <span>Business Manager</span>
        </div>
      </div>

      <nav className="sidebar-nav">

        <p className="nav-title">MAIN MENU</p>

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`nav-item ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}

        <p className="nav-title settings-title">SYSTEM</p>

        <button className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </button>

      </nav>

      <div className="sidebar-bottom">

        <div className="user-profile">
          <div className="avatar">
            E
          </div>

          <div>
            <strong>EM-PLUGS</strong>
            <span>Administrator</span>
          </div>
        </div>

        <button className="logout-btn">
          <LogOut size={18} />
          Logout
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;
