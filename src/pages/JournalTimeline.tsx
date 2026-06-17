import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Sprout,
  Droplets,
  Bug,
  FileText,
  Loader2,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { Plot, JournalEntry } from '../../shared/types.js';
import { useStore } from '../store';
import { plots, journal } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

export default function JournalTimeline() {
  const { plotId } = useParams<{ plotId: string }>();
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fetchData = async () => {
    if (!plotId) return;
    setLoading(true);
    try {
      const pid = parseInt(plotId);
      const [plotData, journalData] = await Promise.all([
        plots.getPlot(pid),
        journal.getJournal(pid),
      ]);
      setPlot(plotData);
      setEntries(journalData);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [plotId]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = parseInt(entry.target.getAttribute('data-id') || '0');
            setVisibleItems((prev) => new Set(prev).add(id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    itemRefs.current.forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
      }
    });

    return () => {
      itemRefs.current.forEach((ref) => {
        if (ref && observerRef.current) {
          observerRef.current.unobserve(ref);
        }
      });
    };
  }, [entries]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条日志吗？')) return;
    try {
      await journal.deleteJournal(id);
      showToast('删除成功', 'success');
      fetchData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    }
  };

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

  if (!plot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">地块不存在</p>
          <button
            onClick={() => navigate('/journal')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 pb-24">
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedPhoto}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/journal')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回我的地块
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                地块 {plot.plotNumber} 的种植日志
              </h1>
              <div className="flex items-center gap-3">
                <StatusBadge status={plot.status} />
                <span className="text-gray-500 text-sm">
                  {plot.location} · {plot.area} ㎡
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">{entries.length}</p>
              <p className="text-gray-500 text-sm">条记录</p>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">暂无日志</h3>
            <p className="text-gray-500 mb-6">点击右下角的浮动按钮添加第一条种植日志</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-200 via-green-400 to-green-200 transform -translate-x-1/2" />

            <div className="space-y-8">
              {entries.map((entry, index) => {
                const isLeft = index % 2 === 0;
                const isVisible = visibleItems.has(entry.id);

                return (
                  <div
                    key={entry.id}
                    data-id={entry.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(entry.id, el);
                    }}
                    className={cn(
                      'relative flex items-center',
                      isLeft ? 'justify-start' : 'justify-end'
                    )}
                  >
                    <div className="absolute left-1/2 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-lg transform -translate-x-1/2 z-10" />

                    <div
                      className={cn(
                        'w-[calc(50%-2rem)] bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all duration-500',
                        isVisible
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-8',
                        isLeft ? 'translate-x-0' : 'translate-x-0'
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-gray-800">
                            {new Date(entry.date).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/journal/${plotId}/edit/${entry.id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {entry.planting && (
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                            <Sprout className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">种植内容</p>
                            <p className="text-gray-700">{entry.planting}</p>
                          </div>
                        </div>
                      )}

                      {entry.fertilized && (
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                            <Droplets className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">施肥情况</p>
                            <p className="text-gray-700">
                              {entry.fertilizerType || '已施肥'}
                            </p>
                          </div>
                        </div>
                      )}

                      {entry.pests && (
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                            <Bug className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">虫害情况</p>
                            <p className="text-gray-700">{entry.pests}</p>
                          </div>
                        </div>
                      )}

                      {entry.notes && (
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">备注</p>
                            <p className="text-gray-700">{entry.notes}</p>
                          </div>
                        </div>
                      )}

                      {entry.photos && entry.photos.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {entry.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={photo}
                              alt=""
                              className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedPhoto(photo)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/journal/${plotId}/new`)}
        className={cn(
          'fixed bottom-8 right-8 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg',
          'flex items-center justify-center hover:bg-green-700 active:scale-95',
          'transition-all duration-200 z-40'
        )}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
