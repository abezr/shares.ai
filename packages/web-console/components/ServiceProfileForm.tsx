"use client";
import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";

const CREATE_SERVICE_PROFILE = gql`
  mutation CreateServiceProfile($name: String!, $goals: JSON!) {
    createServiceProfile(name: $name, goals: $goals) {
      id
      name
      goals
      created_at
      updated_at
    }
  }
`;

export default function ServiceProfileForm() {
  const [name, setName] = useState("");
  const [goalsText, setGoalsText] = useState("{\n  \"key\": \"value\"\n}");
  const [created, setCreated] = useState<any[]>([]);
  const [createProfile, { loading, error }] = useMutation(CREATE_SERVICE_PROFILE);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let goals: any;
    try {
      goals = JSON.parse(goalsText);
    } catch (e) {
      alert("Goals must be valid JSON");
      return;
    }

    const res = await createProfile({ variables: { name, goals } });
    if (res.data?.createServiceProfile) {
      setCreated((prev) => [res.data.createServiceProfile, ...prev]);
      setName("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create Service Profile</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="My Service"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Goals (JSON)</label>
          <textarea
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
        {error && <p className="text-red-600">Error: {error.message}</p>}
      </form>

      {created.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Recently Created</h2>
          <ul className="space-y-2">
            {created.map((p, idx) => (
              <li key={idx} className="p-4 bg-white rounded shadow">
                <div className="font-medium">{p.name}</div>
                <pre className="text-sm text-gray-600 overflow-auto">{JSON.stringify(p.goals, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
