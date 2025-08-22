import Head from "next/head";
import ServiceProfileForm from "../components/ServiceProfileForm";

export default function Home() {
  return (
    <>
      <Head>
        <title>Aether Web Console</title>
      </Head>
      <main className="min-h-screen">
        <div className="py-10 bg-indigo-700 text-white">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-3xl font-bold">Aether Web Console</h1>
            <p className="text-indigo-200">Create Service Profiles and trigger the backend flow.</p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6">
          <ServiceProfileForm />
        </div>
      </main>
    </>
  );
}
