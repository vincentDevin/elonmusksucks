import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container mx-auto my-8 px-4 bg-background text-content min-h-screen transition-colors duration-300">
      <div className="bg-surface shadow rounded-lg p-6 text-center transition-colors duration-300">
        <h1 className="text-4xl font-bold mb-6">Welcome to ElonMuskSucks</h1>
        <p className="mb-4">A satirical prediction market for Elon Musk’s next chaos.</p>
        <div className="space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}