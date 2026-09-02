import { Search, Bell } from "lucide-react";

function Header() {
  return (
    <header className="header">

      <div className="search-box">
        <Search size={19} />

        <input
          type="text"
          placeholder="Search products..."
        />
      </div>

      <div className="header-right">

        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        <div className="header-user">

          <div className="header-avatar">
            E
          </div>

          <div>
            <strong>Administrator</strong>
            <span>EM-PLUGS</span>
          </div>

        </div>

      </div>

    </header>
  );
}

export default Header;
