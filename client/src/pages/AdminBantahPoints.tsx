import React, { useState } from 'react';
import { useAdminQuery, adminApiRequest } from '@/lib/adminApi';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy,
  TrendingUp,
  Users,
  Search,
  Download,
  AlertCircle,
  Zap,
  Target,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  level: number;
  points: number;
  balance: string;
  streak: number;
  createdAt: string;
  lastLogin: string;
  status: string;
  isAdmin: boolean;
}

interface PointsStats {
  totalPointsDistributed: number;
  averagePointsPerUser: number;
  medianPointsPerUser: number;
  topDistributors: Array<{
    username: string;
    points: number;
  }>;
  pointsDistributionBrackets: {
    [key: string]: number; // e.g., "0-100": 45, "100-500": 120
  };
}

export default function AdminBantahPoints() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'points-desc' | 'points-asc' | 'username' | 'recent'>('points-desc');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading: usersLoading, refetch } = useAdminQuery('/api/admin/users?limit=1000', {
    retry: false,
  });

  // Calculate stats
  const stats: PointsStats = React.useMemo(() => {
    if (users.length === 0) {
      return {
        totalPointsDistributed: 0,
        averagePointsPerUser: 0,
        medianPointsPerUser: 0,
        topDistributors: [],
        pointsDistributionBrackets: {},
      };
    }

    const points = users.map((u: User) => u.points);
    const totalPoints = points.reduce((a: number, b: number) => a + b, 0);
    const avgPoints = totalPoints / users.length;
    const sortedPoints = [...points].sort((a, b) => a - b);
    const medianPoints = sortedPoints[Math.floor(sortedPoints.length / 2)];

    // Top distributors (users with most points)
    const topDistributors = [...users]
      .sort((a: User, b: User) => b.points - a.points)
      .slice(0, 10)
      .map((u: User) => ({ username: u.username, points: u.points }));

    // Distribution brackets
    const brackets: { [key: string]: number } = {
      '0': 0,
      '1-100': 0,
      '101-500': 0,
      '501-1000': 0,
      '1001-5000': 0,
      '5001-10000': 0,
      '10001+': 0,
    };

    users.forEach((u: User) => {
      if (u.points === 0) brackets['0']++;
      else if (u.points <= 100) brackets['1-100']++;
      else if (u.points <= 500) brackets['101-500']++;
      else if (u.points <= 1000) brackets['501-1000']++;
      else if (u.points <= 5000) brackets['1001-5000']++;
      else if (u.points <= 10000) brackets['5001-10000']++;
      else brackets['10001+']++;
    });

    return {
      totalPointsDistributed: totalPoints,
      averagePointsPerUser: avgPoints,
      medianPointsPerUser: medianPoints,
      topDistributors,
      pointsDistributionBrackets: brackets,
    };
  }, [users]);

  // Filter and sort users
  const filteredUsers = users.filter((user: User) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a: User, b: User) => {
    switch (sortBy) {
      case 'points-desc':
        return b.points - a.points;
      case 'points-asc':
        return a.points - b.points;
      case 'username':
        return a.username.localeCompare(b.username);
      case 'recent':
        return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
      default:
        return 0;
    }
  });

  const exportPointsData = () => {
    const headers = ['Username', 'Email', 'Points', 'Level', 'Status', 'Last Login', 'Created At'];
    const rows = sortedUsers.map((u: User) => [
      u.username,
      u.email,
      u.points.toString(),
      u.level.toString(),
      u.status,
      u.lastLogin,
      u.createdAt,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bantah-points-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (usersLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Bantah Points Distribution
            </h1>
            <p className="text-slate-400 mt-1">Track and manage Bantah Points (BPTS) awarded to users</p>
          </div>
          <Button 
            onClick={exportPointsData}
            className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Points Distributed */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Total Points Distributed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.totalPointsDistributed.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">BPTS awarded in total</p>
            </CardContent>
          </Card>

          {/* Average Points */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Average Per User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.averagePointsPerUser.toFixed(1)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Mean distribution</p>
            </CardContent>
          </Card>

          {/* Median Points */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                Median Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.medianPointsPerUser.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Middle value</p>
            </CardContent>
          </Card>

          {/* Users Count */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {users.length.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active on platform</p>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Brackets */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Points Distribution by Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.pointsDistributionBrackets).map(([bracket, count]) => (
                <div key={bracket} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <div className="text-slate-300 text-xs font-semibold mb-1">{bracket} BPTS</div>
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {((count / users.length) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Points Holders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top 10 Points Holders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topDistributors.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-slate-500">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-yellow-600 text-white font-bold w-8 h-8 flex items-center justify-center rounded-full">
                      {index + 1}
                    </Badge>
                    <span className="text-white font-medium">{user.username}</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white">
                    {user.points.toLocaleString()} BPTS
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <CardTitle className="text-white">All Users - Points View</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search username, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-md text-sm"
                >
                  <option value="points-desc">Points (High to Low)</option>
                  <option value="points-asc">Points (Low to High)</option>
                  <option value="username">Username (A-Z)</option>
                  <option value="recent">Recent Login</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-400">Username</th>
                    <th className="text-left p-3 text-slate-400">Email</th>
                    <th className="text-left p-3 text-slate-400">Points (BPTS)</th>
                    <th className="text-left p-3 text-slate-400">Level</th>
                    <th className="text-left p-3 text-slate-400">Status</th>
                    <th className="text-left p-3 text-slate-400">Last Login</th>
                    <th className="text-left p-3 text-slate-400">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.slice(0, 100).map((user: User) => (
                    <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer">
                      <td className="p-3">
                        <div className="font-medium text-white">{user.username}</div>
                        <div className="text-xs text-slate-400">{user.firstName} {user.lastName}</div>
                      </td>
                      <td className="p-3 text-slate-300 text-xs">{user.email}</td>
                      <td className="p-3">
                        <Badge className="bg-yellow-600/20 text-yellow-300 font-bold">
                          {user.points.toLocaleString()} BPTS
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={user.level > 0 ? 'bg-blue-600/20 text-blue-300' : 'bg-gray-600/20 text-gray-300'}>
                          {user.level}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={user.status === 'active' ? 'bg-green-600/20 text-green-300' : 'bg-gray-600/20 text-gray-300'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedUsers.length > 100 && (
                <div className="text-center p-4 text-slate-400 text-sm">
                  Showing 100 of {sortedUsers.length} users. Export CSV to see all.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
