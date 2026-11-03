import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { homeFor, useAuth } from "./auth.jsx";
import BusinessLayout, { Gate } from "./components/BusinessLayout.jsx";
import Layout from "./components/Layout.jsx";
import CarWash from "./pages/CarWash.jsx";
import Expenses from "./pages/Expenses.jsx";
import EmployeeDetail from "./pages/EmployeeDetail.jsx";
import Employees from "./pages/Employees.jsx";
import Attendance from "./pages/Attendance.jsx";
import EmployeeAttendance from "./pages/EmployeeAttendance.jsx";
import Investments from "./pages/Investments.jsx";
import Reports from "./pages/Reports.jsx";
import Salary from "./pages/Salary.jsx";
import SalarySlip, { AllSlips } from "./pages/SalarySlip.jsx";
import Taxi from "./pages/Taxi.jsx";
import TaxiAccount from "./pages/TaxiAccount.jsx";
import TaxiDriverDetail from "./pages/TaxiDriverDetail.jsx";
import TaxiDrivers from "./pages/TaxiDrivers.jsx";
import TaxiEarnings from "./pages/TaxiEarnings.jsx";
import TaxiExpenses from "./pages/TaxiExpenses.jsx";
import TaxiNetProfit from "./pages/TaxiNetProfit.jsx";
import TaxiSalary from "./pages/TaxiSalary.jsx";
import TaxiVehicleDetail from "./pages/TaxiVehicleDetail.jsx";
import TaxiVehicles from "./pages/TaxiVehicles.jsx";
import Planned from "./pages/Planned.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

// roles: who may enter. Admin can also open the manager area.
function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Layout>{children}</Layout>;
}

function BusinessHome() {
  const { slug } = useParams();
  return slug === "taxi" ? <Taxi /> : <CarWash />;
}

// Pooja Taxi has its own driver salary page; the other businesses keep the employee salary sheet.
function SalaryHome() {
  const { slug } = useParams();
  return slug === "taxi" ? <TaxiSalary /> : <Salary />;
}

// Pooja Taxi has no Investments page; AutoShine keeps its own.
function InvestmentsHome() {
  const { slug } = useParams();
  return slug === "taxi" ? <Navigate to="/business/taxi" replace /> : <Investments />;
}

// Pooja Taxi expenses are tracked car by car; AutoShine keeps the general expenses page.
function ExpensesHome() {
  const { slug } = useParams();
  return slug === "taxi" ? <TaxiExpenses /> : <Expenses />;
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? homeFor(user) : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <Protected roles={["admin"]}>
            <Dashboard area="Admin" />
          </Protected>
        }
      />
      <Route
        path="/manager"
        element={
          <Protected roles={["admin", "manager"]}>
            <Dashboard area="Manager" />
          </Protected>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <Protected roles={["admin"]}>
            <Employees />
          </Protected>
        }
      />
      <Route
        path="/admin/employees/:id"
        element={
          <Protected roles={["admin"]}>
            <EmployeeDetail />
          </Protected>
        }
      />
      <Route
        path="/attendance"
        element={
          <Protected roles={["admin", "manager"]}>
            <Attendance />
          </Protected>
        }
      />
      <Route
        path="/attendance/:id"
        element={
          <Protected roles={["admin", "manager"]}>
            <EmployeeAttendance />
          </Protected>
        }
      />
      <Route
        path="/planned"
        element={
          <Protected roles={["admin", "manager"]}>
            <Planned />
          </Protected>
        }
      />
      <Route
        path="/business/:slug"
        element={
          <Protected roles={["admin", "manager"]}>
            <BusinessLayout />
          </Protected>
        }
      >
        <Route index element={<BusinessHome />} />
        <Route path="vehicles" element={<Gate roles={["admin", "manager"]} only="taxi"><TaxiVehicles /></Gate>} />
        <Route path="vehicles/:id" element={<Gate roles={["admin", "manager"]} only="taxi"><TaxiVehicleDetail /></Gate>} />
        <Route path="earnings" element={<Gate roles={["admin", "manager"]} only="taxi"><TaxiEarnings /></Gate>} />
        <Route path="account/:vehicleId" element={<Gate only="taxi"><TaxiAccount /></Gate>} />
        <Route path="drivers" element={<Gate only="taxi"><TaxiDrivers /></Gate>} />
        <Route path="drivers/:id" element={<Gate only="taxi"><TaxiDriverDetail /></Gate>} />
        <Route path="expenses" element={<Gate roles={["admin", "manager"]}><ExpensesHome /></Gate>} />
        <Route path="net-profit" element={<Gate only="taxi"><TaxiNetProfit /></Gate>} />
        <Route path="employees" element={<Gate only="carwash"><Employees /></Gate>} />
        <Route path="salary" element={<Gate><SalaryHome /></Gate>} />
        <Route path="salary/slips/:month" element={<Gate><AllSlips /></Gate>} />
        <Route path="salary/slip/:empId/:month" element={<Gate><SalarySlip /></Gate>} />
        <Route path="investments" element={<Gate><InvestmentsHome /></Gate>} />
        <Route path="reports" element={<Gate><Reports /></Gate>} />
      </Route>
      <Route path="*" element={<Root />} />
    </Routes>
  );
}
