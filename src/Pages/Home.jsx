export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Rooms" link="/rooms" />
      <Card title="Tenants" link="/tenants" />
      <Card title="Rent" link="/rent" />
      <Card title="Maintenance" link="/maintenance" />
    </div>
  );
}

function Card({ title, link }) {
  return (
    <a href={link}
      className="bg-white p-6 rounded shadow hover:shadow-md transition">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-gray-500 mt-2">
        Manage {title.toLowerCase()}
      </p>
    </a>
  );
}
