import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  MapPin,
  Maximize2,
  Calendar,
  ChevronRight,
  Loader2,
  Sprout,
} from 'lucide-react';
import type { Plot, Claim, JournalEntry } from '../../shared/types.js';
import { useStore } from '../store';
import { claims, journal, plots } from '../services/api';
import StatusBadge from '../components/StatusBadge';

interface PlotWithLatestJournal extends Plot {
  latestJournal?: JournalEntry;
  journalCount: number;
}

export default function JournalList() {
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [myPlots, setMyPlots] = useState<PlotWithLatestJournal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyPlots = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [claimsData, allPlots] = await Promise.all([
        claims.getClaims(),
        plots.getPlots(),
      ]);

      const myApprovedClaims = claimsData.filter(
        (c) => c.userId === user.id && c.status === 'approved'
      );

      const myPlotIds = myApprovedClaims.map((c) => c.plotId);
      const myPlotsData = allPlots.filter((p) => myPlotIds.includes(p.id));

      const plotsWithJournals: PlotWithLatestJournal[] = await Promise.all(
        myPlotsData.map(async (plot) => {
          try {
            const journalData = await journal.getJournal(plot.id);
            return {
              ...plot,
              latestJournal: journalData[0],
              journalCount: journalData.length,
            };
          } catch {
            return {
              ...plot,
              journalCount: 0,
            };
          }
        })
      );

      setMyPlots(plotsWithJournals);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取我的地块失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPlots();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-green-600" />
            我的种植日志
          </h1>
          <p className="text-gray-500">选择一个地块查看详细的种植记录</p>
        </div>

        {myPlots.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sprout className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">暂无认领的地块</h3>
            <p className="text-gray-500 mb-6">您还没有认领任何地块，快去认领一个开始您的种植之旅吧</p>
            <button
              onClick={() => navigate('/plots')}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              去认领地块
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myPlots.map((plot) => (
              <div
                key={plot.id}
                onClick={() => navigate(`/journal/${plot.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:border-green-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-800">地块 {plot.plotNumber}</h3>
                      <StatusBadge status={plot.status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Maximize2 className="w-4 h-4 text-green-600" />
                        <span>{plot.area} ㎡</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>{plot.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span>{plot.journalCount} 条日志</span>
                      </div>
                      {plot.latestJournal && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span>
                            {new Date(plot.latestJournal.date).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      )}
                    </div>

                    {plot.latestJournal ? (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-2">最新日志</p>
                        <p className="text-gray-700 line-clamp-2">
                          {plot.latestJournal.planting || plot.latestJournal.notes || '暂无内容'}
                        </p>
                        {plot.latestJournal.photos && plot.latestJournal.photos.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {plot.latestJournal.photos.slice(0, 3).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ))}
                            {plot.latestJournal.photos.length > 3 && (
                              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                +{plot.latestJournal.photos.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-50 rounded-xl p-4">
                        <p className="text-amber-600 text-sm">还没有日志记录，点击进入添加第一条日志</p>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
