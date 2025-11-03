import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-white py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About EnuTrac</h1>
        <p className="text-xl text-gray-600 mb-8">
          EnuTrac is a leading GPS tracking solution in Ethiopia, built on the robust Traccar platform.
          We provide real-time tracking, analytics, and local support for businesses managing fleets and assets.
        </p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}