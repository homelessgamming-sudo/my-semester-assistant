import { BranchSelector } from '@/components/BranchSelector';
import { Dashboard } from '@/components/Dashboard';
import { UserProfile } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const Index = () => {
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('userProfile', null);

  const handleLogout = () => {
    setProfile(null);
  };

  if (!profile) {
    return <BranchSelector onComplete={setProfile} />;
  }

  return <Dashboard profile={profile} onLogout={handleLogout} />;
};

export default Index;
