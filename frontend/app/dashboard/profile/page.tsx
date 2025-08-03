"use client";

import React, { useEffect, useState, useRef } from "react";
import { User as UserIcon, ArrowLeft, Pencil, Save, X, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile } from '@/http/profile';

interface UserProfile {
  name: string;
  email: string;
  businessName: string;
  phone: string;
  businessType: string;
  address: string;
  gstNumber: string;
  website: string;
  profileImage?: string;
}

const fieldLabels: Record<keyof UserProfile, string> = {
  name: "Name",
  email: "Email",
  businessName: "Business Name",
  phone: "Phone Number",
  businessType: "Business Type",
  address: "Address",
  gstNumber: "GST Number",
  website: "Website",
  profileImage: "Profile Image",
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState<UserProfile | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getProfile()
      .then(res => {
        setProfile(res.user);
        setEditProfile(res.user);
        setImagePreview(res.user.profileImage || null);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!editMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, editProfile, imageFile]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"><div className="text-lg font-semibold text-gray-600">Loading profile...</div></div>;
  }
  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-2">Profile</h2>
          <p className="text-gray-500">{error || "No profile data found."}</p>
        </div>
      </div>
    );
  }

  const initial = profile.name?.[0]?.toUpperCase() || profile.businessName?.[0]?.toUpperCase() || "";

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editProfile) return;
    const { name, value } = e.target;
    setEditProfile({ ...editProfile, [name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setEditProfile((prev) => prev ? { ...prev, profileImage: reader.result as string } : prev);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editProfile) return;
    setSaving(true);
    setError(null);
    try {
      const { profileImage, ...rest } = editProfile;
      const res = await updateProfile(rest, imageFile || undefined);
      setProfile(res.user);
      setEditProfile(res.user);
      setImagePreview(res.user.profileImage || null);
      setImageFile(null);
      setEditMode(false);
      // yahan localStorage me bhi user ka data update karo
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
    } catch (e) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setImagePreview(profile.profileImage || null);
    setImageFile(null);
    setEditMode(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-10">
      <div className="bg-white/90 p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-indigo-100 relative">
        {/* Back Arrow */}
        <button
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-indigo-50 transition-colors"
          onClick={() => router.back()}
          title="Back"
        >
          <ArrowLeft className="w-6 h-6 text-indigo-600" />
        </button>
        {/* Profile Avatar and Edit Button */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div
              className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg mb-3 border-4 border-white overflow-hidden cursor-pointer relative"
              onClick={() => editMode && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="object-cover w-full h-full" />
              ) : initial ? (
                <span className="text-5xl font-bold text-white select-none">{initial}</span>
              ) : (
                <UserIcon className="w-16 h-16 text-white opacity-80" />
              )}
              {editMode && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                >
                  <Upload className="w-8 h-8 text-white mb-2" />
                  <span className="text-xs text-white font-semibold bg-black/40 rounded px-2 py-1">Change Photo</span>
                </div>
              )}
            </div>
            {editMode && (
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageChange}
              />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.name || profile.businessName}</h2>
          <p className="text-gray-500 text-sm mb-2">{profile.email}</p>
          {!editMode && (
            <button
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition-colors mt-2"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="w-4 h-4" /> Edit Profile
            </button>
          )}
        </div>
        {/* Profile Fields - Two Column Layout */}
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {Object.keys(fieldLabels).filter((key) => key !== "profileImage").map((key) => (
            <div key={key} className="flex flex-col mb-2">
              <label className="block text-gray-700 font-semibold mb-1">
                {fieldLabels[key as keyof UserProfile]}
              </label>
              {editMode ? (
                key === "address" ? (
                  <textarea
                    name={key}
                    value={editProfile ? editProfile[key as keyof UserProfile] : ""}
                    onChange={handleEditChange}
                    className="px-4 py-2 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    rows={2}
                  />
                ) : (
                  <input
                    type="text"
                    name={key}
                    value={editProfile ? editProfile[key as keyof UserProfile] : ""}
                    onChange={handleEditChange}
                    className="px-4 py-2 border-2 border-indigo-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                )
              ) : (
                <input
                  type="text"
                  value={profile[key as keyof UserProfile] || ""}
                  readOnly
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-700 font-medium focus:outline-none"
                />
              )}
            </div>
          ))}
        </form>
        {/* Action Buttons */}
        {editMode && (
          <div className="flex justify-end gap-4 mt-8">
            <button
              className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
              onClick={handleCancel}
              type="button"
              disabled={saving}
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold"
              onClick={handleSave}
              type="button"
              disabled={saving}
            >
              {saving ? <span className="animate-spin mr-2 w-4 h-4 border-b-2 border-white rounded-full"></span> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
