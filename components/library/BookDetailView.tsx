
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Heart, Star, Trash2, Dumbbell, CheckCircle, Edit2, X, PieChart, Square, CheckSquare, AlertTriangle, Save } from 'lucide-react';
import { Book, BookTopic } from '../../types';
import { TYT_TOPICS, AYT_TOPICS, YDT_TOPICS, SESSION_TOPICS } from '../../constants';

interface Props {
  books: Book[];
  initialBookId: number;
  onBack: () => void;
  onUpdateBook: (id: number, updates: Partial<Book>) => void;
  onRemoveBook: (id: number) => void;
}

const BookDetailView: React.FC<Props> = ({ books, initialBookId, onBack, onUpdateBook, onRemoveBook }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = books.findIndex(b => b.id === initialBookId);
    return idx >= 0 ? idx : 0;
  });

  const [hoverRating, setHoverRating] = useState(0);
  const [topicPage, setTopicPage] = useState(0);
  
  // Topic Modal State
  const [selectedTopic, setSelectedTopic] = useState<BookTopic | null>(null);
  
  // Total Question Editing
  const [editTotalQuestions, setEditTotalQuestions] = useState<string>('');
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [isUnknownTotal, setIsUnknownTotal] = useState(false);

  // Solved Question Editing
  const [editSolvedCount, setEditSolvedCount] = useState<string>('');
  const [isEditingSolved, setIsEditingSolved] = useState(false);
  
  // Validation Error State
  const [modalError, setModalError] = useState<string | null>(null);

  // Topic Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Book Delete Confirmation State
  const [showBookDeleteConfirm, setShowBookDeleteConfirm] = useState(false);

  const book = books[currentIndex];
  const hasExplicitTotal = (book.totalQuestions || 0) > 0;

  // Calculate merged topics list based on book exam types
  const displayedTopics = useMemo(() => {
      const subject = book.category;
      const types = book.examTypes || [];
      let topicList: string[] = [];

      // Merge topics based on selected exam types
      if (types.includes('TYT')) {
          topicList = [...topicList, ...(TYT_TOPICS[subject] || [])];
      }
      if (types.includes('AYT')) {
          topicList = [...topicList, ...(AYT_TOPICS[subject] || [])];
      }
      if (types.includes('YDT')) {
          topicList = [...topicList, ...(YDT_TOPICS[subject] || [])];
      }

      // Fallback if no specific exam lists found or no types (legacy)
      if (topicList.length === 0) {
          topicList = SESSION_TOPICS[subject] || [];
      }

      // Deduplicate
      topicList = [...new Set(topicList)];

      // Merge with progress data from the book object
      return topicList.map(label => {
          const existing = book.topics?.find(t => t.label === label);
          return existing || {
              label,
              progress: 0,
              solvedCount: 0,
              externalSolvedCount: 0,
              totalQuestions: undefined, // undefined implies default 150 if explicit mode is off
              correct: 0,
              wrong: 0,
              empty: 0,
              isFinished: false
          };
      }).filter(t => !t.isDeleted); // Filter out deleted topics
  }, [book.category, book.examTypes, book.topics]);

  // Reset pagination if book changes
  useEffect(() => {
      setTopicPage(0);
  }, [book.id]);

  const ITEMS_PER_PAGE = 4;
  const totalTopicPages = Math.ceil(displayedTopics.length / ITEMS_PER_PAGE);
  
  const currentTopicsSlice = displayedTopics.slice(
      topicPage * ITEMS_PER_PAGE, 
      (topicPage + 1) * ITEMS_PER_PAGE
  );

  const handleNext = () => {
    if (currentIndex < books.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const handleNextTopicPage = () => {
      if (topicPage < totalTopicPages - 1) setTopicPage(prev => prev + 1);
  };

  const handlePrevTopicPage = () => {
      if (topicPage > 0) setTopicPage(prev => prev - 1);
  };

  const toggleFavorite = () => {
      onUpdateBook(book.id, { isFavorite: !book.isFavorite });
  };

  const handleRate = (rating: number) => {
      onUpdateBook(book.id, { rating: rating });
  };

  const handleDeleteBook = () => {
      setShowBookDeleteConfirm(true);
  };

  const confirmDeleteBook = () => {
      onRemoveBook(book.id);
      // Component unmounts after onRemoveBook usually triggers state change in parent
  };

  // --- Topic Actions ---
  const handleOpenTopic = (topic: BookTopic) => {
      setSelectedTopic(topic);
      setModalError(null);

      // Setup Total Editing
      if (topic.totalQuestions === 0) {
          setIsUnknownTotal(true);
          setEditTotalQuestions('');
      } else {
          setIsUnknownTotal(false);
          // If 0, show empty string to allow placeholder
          setEditTotalQuestions(topic.totalQuestions ? topic.totalQuestions.toString() : '');
      }
      setIsEditingTotal(false);

      // Setup Solved Editing
      const totalSolved = (topic.solvedCount || 0) + (topic.externalSolvedCount || 0);
      // If 0, show empty string to allow placeholder
      setEditSolvedCount(totalSolved === 0 ? '' : totalSolved.toString());
      setIsEditingSolved(false);

      setShowDeleteConfirm(false); // Reset confirmation state
  };

  const handleCloseTopic = () => {
      setSelectedTopic(null);
      setShowDeleteConfirm(false);
      setModalError(null);
  };

  const handleMarkTopicComplete = () => {
      if (!selectedTopic) return;
      
      const currentTopics = book.topics || [];
      const idx = currentTopics.findIndex(t => t.label === selectedTopic.label);
      const updatedTopics = [...currentTopics];
      
      // Toggle finished state
      const newFinishedState = !selectedTopic.isFinished;

      if (idx !== -1) {
          updatedTopics[idx] = {
              ...updatedTopics[idx],
              isFinished: newFinishedState,
          };
      } else {
          // Add if not exists in book.topics
          updatedTopics.push({
              ...selectedTopic,
              isFinished: newFinishedState,
          });
      }
      
      onUpdateBook(book.id, { topics: updatedTopics });
      // Update local state to reflect immediately
      setSelectedTopic(prev => prev ? ({ ...prev, isFinished: newFinishedState }) : null);
  };

  const updateBookTotals = (newTopics: BookTopic[]) => {
      // Helper to recalculate total solved/progress for the book based on new topics state
      const totalBookQuestions = book.totalQuestions || 0;
      let totalBookSolved = 0;
      
      newTopics.forEach(t => {
          if (!t.isDeleted) {
              totalBookSolved += (t.solvedCount || 0) + (t.externalSolvedCount || 0);
          }
      });

      const updates: Partial<Book> = { topics: newTopics, solvedQuestions: totalBookSolved };
      
      if (totalBookQuestions > 0) {
          updates.progress = Math.min(100, Math.round((totalBookSolved / totalBookQuestions) * 100));
      }
      
      return updates;
  };

  const handleSaveTotalQuestions = () => {
      if (!selectedTopic) return;
      setModalError(null);
      
      let newTotal: number | undefined;

      if (isUnknownTotal) {
          newTotal = 0; // 0 represents "Unknown"
      } else {
          // If empty string, treat as undefined (default)
          if (editTotalQuestions === '') {
              newTotal = undefined;
          } else {
              const parsed = parseInt(editTotalQuestions);
              if (!isNaN(parsed) && parsed > 0) {
                  newTotal = parsed;
              } else {
                  newTotal = undefined; 
              }
          }
      }

      // VALIDATION: Check if new total is less than currently solved
      const currentSolved = (selectedTopic.solvedCount || 0) + (selectedTopic.externalSolvedCount || 0);
      if (newTotal !== undefined && newTotal !== 0 && newTotal < currentSolved) {
          setModalError(`Toplam soru sayısı çözülen (${currentSolved}) sayısından az olamaz.`);
          return;
      }

      const currentTopics = book.topics || [];
      const idx = currentTopics.findIndex(t => t.label === selectedTopic.label);
      const updatedTopics = [...currentTopics];

      const newTopicData = {
          ...selectedTopic,
          totalQuestions: newTotal
      };

      if (idx !== -1) {
          updatedTopics[idx] = { ...updatedTopics[idx], totalQuestions: newTotal };
      } else {
          updatedTopics.push(newTopicData);
      }

      onUpdateBook(book.id, updateBookTotals(updatedTopics));
      setIsEditingTotal(false);
      setSelectedTopic(newTopicData);
  };

  const handleSaveSolvedCount = () => {
      if (!selectedTopic) return;
      setModalError(null);

      let inputVal = 0;
      if (editSolvedCount !== '') {
          inputVal = parseInt(editSolvedCount);
      }

      if (isNaN(inputVal) || inputVal < 0) return;

      // VALIDATION: Check against total questions
      const topicTotal = selectedTopic.totalQuestions;
      const isTotalUnknown = topicTotal === 0;

      if (!isTotalUnknown) {
          const effectiveTotal = topicTotal || 150; // Default if undefined
          if (inputVal > effectiveTotal) {
              setModalError(`Çözülen soru sayısı toplamdan (${effectiveTotal}) fazla olamaz.`);
              return;
          }
      }

      const appSolved = selectedTopic.solvedCount || 0;
      // Calculate manual portion: External = Total Solved (Input) - App Tracked
      const newExternal = inputVal - appSolved;

      const currentTopics = book.topics || [];
      const idx = currentTopics.findIndex(t => t.label === selectedTopic.label);
      const updatedTopics = [...currentTopics];

      // Update local object for UI
      const updatedTopicData = {
          ...selectedTopic,
          externalSolvedCount: newExternal
      };
      
      // Recalculate topic progress
      const totalQ = selectedTopic.totalQuestions || 150; 
      if (selectedTopic.totalQuestions !== 0) {
          updatedTopicData.progress = Math.min(100, Math.round((inputVal / totalQ) * 100));
      }

      if (idx !== -1) {
          updatedTopics[idx] = { 
              ...updatedTopics[idx], 
              externalSolvedCount: newExternal,
              progress: updatedTopicData.progress 
          };
      } else {
          updatedTopics.push(updatedTopicData);
      }

      onUpdateBook(book.id, updateBookTotals(updatedTopics));
      setIsEditingSolved(false);
      setSelectedTopic(updatedTopicData);
  };

  const confirmRemoveTopic = () => {
      if (!selectedTopic) return;
      const currentTopics = book.topics || [];
      const idx = currentTopics.findIndex(t => t.label === selectedTopic.label);
      const updatedTopics = [...currentTopics];

      if (idx !== -1) {
          // Mark existing topic as deleted
          updatedTopics[idx] = { ...updatedTopics[idx], isDeleted: true };
      } else {
          // If it wasn't in book.topics yet (was default), add it as deleted
          updatedTopics.push({
              label: selectedTopic.label,
              progress: 0,
              isDeleted: true
          });
      }
      
      onUpdateBook(book.id, updateBookTotals(updatedTopics));
      handleCloseTopic();
  };

  // Helper to get total display value for topic
  const getTopicTotalSolved = (t: BookTopic) => (t.solvedCount || 0) + (t.externalSolvedCount || 0);

  // Input Handlers
  const handleEditTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length > 4) return;
      if (val === '' || /^\d+$/.test(val)) {
          setEditTotalQuestions(val);
          setModalError(null);
      }
  };

  const handleEditSolvedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length > 4) return;
      if (val === '' || /^\d+$/.test(val)) {
          setEditSolvedCount(val);
          setModalError(null);
      }
  };

  return (
    <div className="flex-1 h-full w-full bg-[url('https://i.imgur.com/hvIoUYE.png')] bg-cover bg-center bg-no-repeat font-sans relative flex flex-col overflow-hidden">
      
      {/* Top Green Background Shape - Fixed/Static */}
      <div className="absolute top-0 left-0 w-full h-[35%] bg-[#94AFA0] rounded-b-[40%] z-0 scale-x-150" />

      {/* Header - Fixed/Static */}
      <div className="relative z-50 px-6 pt-10 pb-2 flex items-center justify-between flex-shrink-0">
         <button onClick={onBack} className="w-10 h-10 flex items-center justify-center -ml-2 text-[#3D3D3D]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 5L7 12L16 19Z" />
            </svg>
         </button>
         <h1 className="text-xl font-bold text-[#3D3D3D]">Detaylar</h1>
         <button onClick={handleDeleteBook} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-white/20 rounded-full transition-colors">
            <Trash2 className="w-5 h-5" />
         </button>
      </div>

      {/* Static Upper Section (Carousel & Title) */}
      <div className="flex-shrink-0 relative z-10 w-full flex flex-col items-center">
          
          {/* Gallery Carousel - Adjusted Height for static fit */}
          <div className="relative w-full flex items-center justify-center h-[260px] mb-2 mt-2">
            
            {/* Previous Card Peek */}
            {currentIndex > 0 && (
                <div 
                    onClick={handlePrev}
                    className="absolute left-4 w-[120px] h-[170px] bg-[#FDF6E3] rounded-xl shadow-lg transform scale-90 opacity-60 cursor-pointer border border-white/20"
                />
            )}

            {/* Current Card */}
            <div className="relative w-[160px] h-[220px] bg-[#FFF8E7] rounded-xl shadow-xl flex flex-col p-3 border border-white/40 z-20">
                <div className="absolute top-2 right-2 cursor-pointer" onClick={toggleFavorite}>
                    <Heart 
                        className={`w-5 h-5 transition-all active:scale-90 ${book.isFavorite ? 'fill-red-400 text-red-400' : 'text-gray-300'}`} 
                    />
                </div>
                {/* Book Cover Mock */}
                <div className="flex-1 bg-white/50 rounded-md m-2 mb-1 relative overflow-hidden flex items-center justify-center">
                    <div className="text-center opacity-20 font-serif font-bold text-2xl transform -rotate-45">{book.title.split(' ')[0]}</div>
                </div>
                
                {/* Pagination Dots beneath card within container */}
                <div className="absolute -bottom-6 left-0 w-full flex justify-center gap-1.5">
                    {books.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-[#5A4A42]' : 'bg-[#D4D4D4]'}`} 
                        />
                    ))}
                </div>
            </div>

            {/* Next Card Peek */}
            {currentIndex < books.length - 1 && (
                <div 
                    onClick={handleNext}
                    className="absolute right-4 w-[120px] h-[170px] bg-[#FDF6E3] rounded-xl shadow-lg transform scale-90 opacity-60 cursor-pointer border border-white/20"
                />
            )}
          </div>

          {/* Title & Info - Reduced margins */}
          <div className="flex flex-col items-center mb-2 relative z-10">
            <h2 className="text-xl font-bold text-[#5A4A42] border-b-2 border-[#5A4A42] pb-1 mb-2 px-4 text-center">
                {book.title}
            </h2>
            <div className="flex items-center gap-2" onMouseLeave={() => setHoverRating(0)}>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                            key={star} 
                            onClick={() => handleRate(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            className={`w-4 h-4 cursor-pointer transition-colors ${star <= (hoverRating || book.rating || 0) ? 'fill-[#F1C40F] text-[#F1C40F]' : 'text-gray-300'}`} 
                        />
                    ))}
                </div>
                <Dumbbell className="w-3 h-3 text-gray-400 opacity-60" />
            </div>
          </div>
      </div>

      {/* Scrollable Bottom Section (Teal Area) */}
      <div className="flex-1 w-full bg-[#A8C9D5] rounded-t-[40px] p-6 pb-32 overflow-y-auto no-scrollbar relative z-10">
            
            <div className="grid grid-cols-3 gap-6 mb-8 text-center text-[#4A5D50]">
                    <div>
                        <div className="text-[10px] font-bold opacity-60 mb-1">Toplam Soru</div>
                        <div className="w-10 h-1 bg-[#F1C40F] mx-auto rounded-full mb-1"></div>
                        <div className="text-xl font-bold">{book.totalQuestions || (hasExplicitTotal ? book.totalQuestions : '?')}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold opacity-60 mb-1">Son Çözülen</div>
                        <div className="w-10 h-1 bg-[#F1C40F] mx-auto rounded-full mb-1"></div>
                        <div className="text-sm font-bold mt-1.5">{book.lastSolvedDate ? book.lastSolvedDate.split(' ')[0] : '-'}</div>
                        <div className="text-[9px] opacity-70">{book.lastSolvedDate ? book.lastSolvedDate.split(' ')[1] : ''}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold opacity-60 mb-1">Harcanan Süre</div>
                        <div className="w-10 h-1 bg-[#F1C40F] mx-auto rounded-full mb-1"></div>
                        <div className="text-sm font-bold mt-1.5">{book.timeSpent || '0dk'}</div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold opacity-60 mb-1">Çözülen Soru</div>
                        <div className="w-10 h-1 bg-[#F1C40F] mx-auto rounded-full mb-1"></div>
                        <div className="text-xl font-bold">{book.solvedQuestions || 0}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold opacity-60 mb-1">Soru/Dakika</div>
                        <div className="w-10 h-1 bg-[#F1C40F] mx-auto rounded-full mb-1"></div>
                        <div className="text-xl font-bold">{book.qpm || 0}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold opacity-60 mb-1">Doğruluk</div>
                        <div className="w-10 h-1 bg-[#F1C40F] mx-auto rounded-full mb-1"></div>
                        <div className="text-xl font-bold">{book.accuracy || 0}%</div>
                    </div>
            </div>

            {/* Topics Section - 2x2 Grid */}
            <div className="bg-[#FFFACD] rounded-3xl p-6 shadow-md relative min-h-[220px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-[#5A4A42] text-center mb-6">Tamamlanma %{book.progress}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    {currentTopicsSlice.length > 0 ? currentTopicsSlice.map((topic, idx) => {
                        // Determine display mode: Count OR Percentage
                        // Show count if: Book has explicit total OR Topic total is specifically "0" (Unknown)
                        const isUnknown = topic.totalQuestions === 0;
                        const showCount = hasExplicitTotal || isUnknown;
                        const totalSolved = getTopicTotalSolved(topic);
                        
                        return (
                            <div 
                                    key={idx} 
                                    onClick={() => handleOpenTopic(topic)}
                                    className={`
                                        bg-white/50 rounded-xl p-3 flex flex-col justify-center shadow-sm min-h-[60px] cursor-pointer hover:bg-white/80 transition-colors
                                        ${topic.isFinished ? 'border-2 border-green-400 bg-green-50/50' : 'border-0'}
                                    `}
                            >
                                <div className="flex justify-between items-center mb-2 gap-2">
                                    <span className="text-[10px] font-bold text-[#5A4A42] leading-tight break-words flex-1">{topic.label}</span>
                                    <span className="text-[9px] font-bold text-[#5A4A42] opacity-70 flex-shrink-0 whitespace-nowrap">
                                        {showCount ? `${totalSolved} Soru` : `%${topic.progress}`}
                                    </span>
                                </div>
                                {!showCount && (
                                    <div className="h-2 bg-white rounded-full overflow-hidden border border-[#5A4A42]/10 w-full mt-auto">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${topic.progress > 80 ? 'bg-green-400' : topic.progress > 40 ? 'bg-yellow-300' : 'bg-red-300'}`}
                                            style={{ width: `${topic.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="col-span-2 text-center text-sm text-[#5A4A42]/60 italic py-4">Konu bulunamadı.</div>
                    )}
                </div>
                
                {/* Pagination Controls */}
                {displayedTopics.length > ITEMS_PER_PAGE && (
                    <>
                        <div className="absolute top-1/2 left-0 -ml-3">
                            <button 
                                onClick={handlePrevTopicPage}
                                disabled={topicPage === 0}
                                className={`p-1 rounded-full transition-opacity ${topicPage === 0 ? 'opacity-20 cursor-default' : 'opacity-100 hover:bg-white/20'}`}
                            >
                                <ChevronLeft className="w-8 h-8 text-[#5A4A42]" />
                            </button>
                        </div>
                        <div className="absolute top-1/2 right-0 -mr-3">
                            <button 
                                onClick={handleNextTopicPage}
                                disabled={topicPage >= totalTopicPages - 1}
                                className={`p-1 rounded-full transition-opacity ${topicPage >= totalTopicPages - 1 ? 'opacity-20 cursor-default' : 'opacity-100 hover:bg-white/20'}`}
                            >
                                <ChevronRight className="w-8 h-8 text-[#5A4A42]" />
                            </button>
                        </div>
                        
                        {/* Page Indicator */}
                        <div className="flex justify-center gap-1 mt-4">
                            {Array.from({ length: totalTopicPages }).map((_, i) => (
                                <div 
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === topicPage ? 'bg-[#5A4A42]' : 'bg-[#5A4A42]/20'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
      </div>

      {/* TOPIC DETAIL MODAL */}
      {selectedTopic && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-[#FFFBEB] w-full max-w-sm rounded-[30px] p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-[#5A4A42] w-[90%] leading-tight">{selectedTopic.label}</h2>
                      <button onClick={handleCloseTopic} className="bg-gray-200 rounded-full p-1.5 hover:bg-gray-300 transition-colors">
                          <X className="w-5 h-5 text-gray-600" />
                      </button>
                  </div>

                  {/* Main Stats */}
                  <div className="flex flex-col items-center mb-6">
                      <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-md">
                              <circle cx="50" cy="50" r="40" stroke={selectedTopic.totalQuestions === 0 ? "#E0E0E0" : "#FCEBB6"} strokeWidth="10" fill="none" />
                              {selectedTopic.totalQuestions !== 0 && (
                                  <circle 
                                    cx="50" cy="50" r="40" stroke="#2D3A31" strokeWidth="10" fill="none" 
                                    strokeDasharray={`${(selectedTopic.progress / 100) * 251} 251`} 
                                    strokeLinecap="round"
                                  />
                              )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#5A4A42]">
                              {selectedTopic.totalQuestions === 0 ? (
                                  <span className="text-5xl font-bold opacity-60">?</span>
                              ) : (
                                  <span className="text-3xl font-bold">%{selectedTopic.progress}</span>
                              )}
                              <span className="text-[10px] uppercase font-bold opacity-60">
                                  {selectedTopic.totalQuestions === 0 ? "Bilinmiyor" : "Tamamlandı"}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Validation Error Banner */}
                  {modalError && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-red-600 font-bold leading-tight">
                              {modalError}
                          </p>
                      </div>
                  )}

                  {/* Grid Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      {/* Total Question - Editable & Toggleable */}
                      <div className="bg-white/60 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center relative">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Toplam Soru</span>
                          
                          {/* Editing Mode */}
                          {isEditingTotal ? (
                              <div className="flex flex-col items-center gap-2 w-full">
                                  {/* Toggle Unknown */}
                                  <div 
                                    onClick={() => {
                                        setIsUnknownTotal(!isUnknownTotal);
                                        if (!isUnknownTotal) {
                                            setEditTotalQuestions('');
                                            setModalError(null);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 cursor-pointer"
                                  >
                                      {isUnknownTotal ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4 text-gray-400" />}
                                      <span className="text-[9px] font-bold text-gray-500">Bilinmiyor</span>
                                  </div>

                                  <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={editTotalQuestions}
                                    onChange={handleEditTotalChange}
                                    disabled={isUnknownTotal}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTotalQuestions()}
                                    className={`w-16 text-center font-bold text-[#5A4A42] bg-white border border-orange-300 rounded text-sm h-6 ${isUnknownTotal ? 'opacity-30' : ''}`}
                                    autoFocus={!isUnknownTotal}
                                    placeholder={isUnknownTotal ? "-" : "0"}
                                  />
                                  <button onClick={handleSaveTotalQuestions} className="text-[9px] bg-orange-200 px-2 py-0.5 rounded text-[#5A4A42] font-bold">
                                      Kaydet
                                  </button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="font-bold text-[#5A4A42] text-lg">
                                      {selectedTopic.totalQuestions === 0 ? '?' : (selectedTopic.totalQuestions || 150)}
                                  </span>
                                  <button onClick={() => setIsEditingTotal(true)} className="text-gray-400 hover:text-orange-500">
                                      <Edit2 className="w-3 h-3" />
                                  </button>
                              </div>
                          )}
                      </div>

                      {/* Solved Count - Editable */}
                      <div className="bg-white/60 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Çözülen</span>
                          
                          {isEditingSolved ? (
                              <div className="flex flex-col items-center gap-1 w-full mt-1">
                                  <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={editSolvedCount}
                                    onChange={handleEditSolvedChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSolvedCount()}
                                    className="w-16 text-center font-bold text-[#5A4A42] bg-white border border-orange-300 rounded text-sm h-6"
                                    autoFocus
                                    placeholder="0"
                                  />
                                  <button onClick={handleSaveSolvedCount} className="text-[9px] bg-orange-200 px-2 py-0.5 rounded text-[#5A4A42] font-bold">
                                      Kaydet
                                  </button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-[#5A4A42] text-lg">
                                    {getTopicTotalSolved(selectedTopic)}
                                </span>
                                <button onClick={() => setIsEditingSolved(true)} className="text-gray-400 hover:text-orange-500">
                                    <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                          )}
                      </div>

                      {/* Pending - Show '?' if unknown */}
                      <div className="bg-white/60 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Kalan</span>
                          <span className="font-bold text-[#5A4A42] text-lg mt-1">
                              {selectedTopic.totalQuestions === 0 
                                  ? '?' 
                                  : Math.max(0, (selectedTopic.totalQuestions || 150) - getTopicTotalSolved(selectedTopic))
                              }
                          </span>
                      </div>

                      {/* Accuracy */}
                      <div className="bg-white/60 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Doğruluk</span>
                          <span className="font-bold text-[#5A4A42] text-lg mt-1">
                              %{selectedTopic.solvedCount && selectedTopic.solvedCount > 0 
                                  ? Math.round(((selectedTopic.correct || 0) / selectedTopic.solvedCount) * 100) 
                                  : 0}
                          </span>
                      </div>
                  </div>

                  {/* Warning Message when Editing Solved */}
                  {isEditingSolved && !modalError && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-orange-600 font-medium leading-tight">
                              Bu soruların geçmişte çözüldüğü varsayılır ve hesabınıza eklenmez. Yalnızca bu kitap/konu ilerlemesini etkiler.
                          </p>
                      </div>
                  )}

                  {/* Performance Breakdown */}
                  <div className="bg-white/40 rounded-xl p-3 mb-6">
                      <h4 className="text-xs font-bold text-[#5A4A42] mb-2 flex items-center gap-1">
                          <PieChart className="w-3 h-3" /> Performans Dağılımı
                      </h4>
                      <div className="flex h-3 rounded-full overflow-hidden w-full mb-1">
                          <div style={{ flex: selectedTopic.correct || 0 }} className="bg-green-400" />
                          <div style={{ flex: selectedTopic.wrong || 0 }} className="bg-red-400" />
                          <div style={{ flex: selectedTopic.empty || 0 }} className="bg-gray-300" />
                          {(!selectedTopic.correct && !selectedTopic.wrong && !selectedTopic.empty) && <div className="flex-1 bg-gray-200" />}
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-[#5A4A42]/70 px-1">
                          <span>{selectedTopic.correct || 0} Doğru</span>
                          <span>{selectedTopic.wrong || 0} Yanlış</span>
                          <span>{selectedTopic.empty || 0} Boş</span>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                      <button 
                        onClick={handleMarkTopicComplete}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm 
                            ${selectedTopic.isFinished 
                                ? 'bg-green-100 text-green-700 border-2 border-green-200' 
                                : 'bg-[#94AFA0] text-white hover:bg-[#839C8E]'
                            }`}
                      >
                          <CheckCircle className={`w-5 h-5 ${selectedTopic.isFinished ? 'text-green-600' : 'text-white'}`} />
                          {selectedTopic.isFinished ? 'Tamamlandı (Geri Al)' : 'Bölümü Tamamlandı Olarak İşaretle'}
                      </button>

                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full border-2 border-red-100 text-red-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors active:scale-95"
                      >
                          <Trash2 className="w-5 h-5" />
                          Konuyu Kitaptan Kaldır
                      </button>
                  </div>

                  {/* Delete Confirmation Overlay */}
                  {showDeleteConfirm && (
                      <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-[30px] animate-fadeIn">
                          <div className="bg-white rounded-2xl p-5 shadow-xl w-[85%] border border-red-100">
                              <div className="flex justify-center mb-3">
                                  <div className="bg-red-100 p-3 rounded-full">
                                      <AlertTriangle className="w-6 h-6 text-red-500" />
                                  </div>
                              </div>
                              <h3 className="text-lg font-bold text-[#5A4A42] mb-2 text-center">Emin misiniz?</h3>
                              <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
                                  <b>{selectedTopic.label}</b> konusunu kitaptan kaldırmak istediğinize emin misiniz?
                              </p>
                              <div className="flex gap-3">
                                  <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 text-xs"
                                  >
                                      İptal
                                  </button>
                                  <button 
                                    onClick={confirmRemoveTopic}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 text-xs"
                                  >
                                      Evet, Sil
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

              </div>
          </div>
      )}

      {/* BOOK DELETE CONFIRMATION OVERLAY */}
      {showBookDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white rounded-[30px] p-6 shadow-2xl w-full max-w-sm relative">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <Trash2 className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-[#3D3D3D] mb-2">Kitabı Sil</h3>
                      <p className="text-gray-500 mb-6 text-sm leading-relaxed px-2">
                          <b>{book.title}</b> kitabını ve tüm ilerlemesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                      </p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setShowBookDeleteConfirm(false)}
                              className="flex-1 py-3 rounded-xl border-2 border-gray-100 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                              Vazgeç
                          </button>
                          <button 
                              onClick={confirmDeleteBook}
                              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-md transition-colors"
                          >
                              Sil
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default BookDetailView;
