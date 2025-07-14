// adjust this import if your Chat component is in a different path
export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div>
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        {/* Add more dashboard widgets/info here in the future */}
      </div>
      <div></div>
    </div>
  );
}
