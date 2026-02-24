
import React, { useState, useEffect } from 'react';
import { Scroll, Plus, BookOpen } from 'lucide-react';
import { LIBRARY_TABS } from '../constants';
import { Book, UserModel } from '../types';
import { bookService } from '../services/bookService';
import BookDetailView from './library/BookDetailView';
import AddBookModal from './library/AddBookModal';

interface Props {
  user: UserModel;
  isDevMode: boolean;
}

const LibraryPage: React.FC<Props> = ({ user, isDevMode }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState('Tümü');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    // Load books from service (handles dev mode internally)
    setBooks(bookService.getBooks());
  }, [isDevMode]); // Reload if dev mode toggles

  const handleAddBook = async (newBookData: Partial<Book>) => {
    // Get latest books first to calculate ID correctly
    const currentBooks = bookService.getBooks();
    const newBook: Book = {
        id: currentBooks.length > 0 ? Math.max(...currentBooks.map(b => b.id)) + 1 : 1,
        title: newBookData.title || 'Yeni Kitap',
        category: newBookData.category || 'Diğer',
        progress: 0,
        color: '#FFF8E7',
        topics: [],
        ...newBookData
    };
    await bookService.addBook(newBook);
    // Refresh local list with a new reference from service
    setBooks(bookService.getBooks()); 
  };

  const handleUpdateBook = async (id: number, updates: Partial<Book>) => {
    const bookToUpdate = books.find(b => b.id === id);
    if (bookToUpdate) {
        const updatedBook = { ...bookToUpdate, ...updates };
        await bookService.updateBook(updatedBook);
        setBooks(bookService.getBooks()); // Refresh list
    }
  };

  const handleRemoveBook = async (id: number) => {
      await bookService.removeBook(id);
      setBooks(bookService.getBooks());
      setSelectedBookId(null);
  };

  const getFilteredBooks = () => {
      switch (activeTab) {
          case 'Favoriler':
              return books.filter(b => b.isFavorite);
          case 'Bitenler':
              return books.filter(b => b.progress === 100);
          case 'İstek':
              return []; 
          default:
              return books;
      }
  };

  const displayedBooks = getFilteredBooks();
  
  const categories = [...new Set(displayedBooks.map(b => b.category))];
  
  // Helper to parse legacy date string (DD.MM.YYYY Weekday)
  const parseLegacyDate = (dateStr: string) => {
      if (!dateStr || dateStr === '-') return 0;
      try {
          const parts = dateStr.split(' ');
          if (parts.length < 1) return 0;
          const [day, month, year] = parts[0].split('.').map(Number);
          if (!day || !month || !year) return 0;
          return new Date(year, month - 1, day).getTime();
      } catch (e) {
          return 0;
      }
  };

  // Filter recent books: Must have actual solved questions > 0
  const recentBooks = books
    .filter(b => (b.solvedQuestions || 0) > 0)
    .sort((a,b) => {
        // Prefer precise timestamp if available
        const timeA = a.lastSolvedAt ? new Date(a.lastSolvedAt).getTime() : parseLegacyDate(a.lastSolvedDate || '');
        const timeB = b.lastSolvedAt ? new Date(b.lastSolvedAt).getTime() : parseLegacyDate(b.lastSolvedDate || '');
        
        if (timeA !== timeB) return timeB - timeA;
        return b.id - a.id;
    })
    .slice(0, 3);

  if (selectedBookId !== null) {
    return (
      <BookDetailView 
        books={books} 
        initialBookId={selectedBookId} 
        onBack={() => setSelectedBookId(null)}
        onUpdateBook={handleUpdateBook} 
        onRemoveBook={handleRemoveBook}
      />
    );
  }

  return (
    <div className="flex-1 h-full w-full overflow-y-auto no-scrollbar pb-32 font-sans relative">
         
         <div className="relative z-10 px-6 pt-12">
             <h1 className="text-3xl font-bold text-[#2D3A31] mb-8">Kitaplık</h1>

             <div className="flex justify-between border-b border-[#FFF0C0] pb-0 mb-8 overflow-x-auto">
                 {LIBRARY_TABS.map(tab => (
                     <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-2 text-sm font-bold transition-all ${activeTab === tab ? 'text-[#FFF8E7] border-b-2 border-[#FFF8E7]' : 'text-[#2D3A31]/50'}`}
                     >
                         {tab}
                     </button>
                 ))}
             </div>

             <div className="bg-[#A8C9D5]/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 mb-8">
                 <h2 className="text-white font-bold text-sm mb-3">Son Çözülenler</h2>
                 <div className="flex gap-4 overflow-x-auto no-scrollbar min-h-[140px]">
                     {recentBooks.length > 0 ? recentBooks.map(book => (
                         <div 
                            key={book.id} 
                            onClick={() => setSelectedBookId(book.id)}
                            className="min-w-[100px] flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                         >
                             <div className="w-24 h-32 bg-[#FFF8E7] rounded-lg shadow-md mb-2 flex items-center justify-center relative overflow-hidden">
                                 <div className="absolute bottom-0 w-full h-1 bg-gray-200"></div>
                                 <span className="text-2xl font-serif opacity-10 rotate-45 font-bold">{book.title.charAt(0)}</span>
                             </div>
                             <span className="text-[10px] font-bold text-white text-center truncate w-full">{book.title}</span>
                         </div>
                     )) : (
                        <div className="flex items-center justify-center w-full h-full opacity-60 text-white text-xs italic">
                            Henüz kitap çözülmedi.
                        </div>
                     )}
                 </div>
             </div>

             <div className="flex justify-center mb-8">
                 <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[#FDE8A8] hover:bg-[#FCEBB6] text-[#5A4A42] font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                 >
                     <Plus className="w-5 h-5" />
                     Yeni Kitap Ekle
                 </button>
             </div>
        </div>

        <div className="bg-[#A8C9D5] min-h-[300px] rounded-t-[40px] px-6 pt-8 pb-12 relative z-10">
            {books.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-60">
                    <BookOpen className="w-16 h-16 text-[#4A5D50] mb-4" strokeWidth={1} />
                    <div className="text-center text-[#4A5D50] font-medium text-lg">Henüz kitap eklemediniz.</div>
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center text-[#4A5D50]/60 py-10 font-medium">Bu kategoride kitap bulunamadı.</div>
            ) : (
                categories.map((category) => (
                    <div key={category} className="mb-6">
                        <div className="flex items-center gap-2 border-b border-white/40 pb-1 mb-4">
                            <h3 className="text-xl font-bold text-[#4A5D50]">{category}</h3>
                            {category === 'Türkçe' && <Scroll className="w-5 h-5 text-[#4A5D50]" />}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             {displayedBooks.filter(b => b.category === category).map(book => (
                                <div 
                                    key={book.id} 
                                    onClick={() => setSelectedBookId(book.id)}
                                    className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                                >
                                     <div className="w-full aspect-[3/4] bg-[#FFF8E7] rounded-xl shadow-sm mb-2 relative flex items-center justify-center overflow-hidden">
                                        <span className="text-4xl font-serif opacity-10 rotate-45 font-bold text-[#5A4A42]/20">{book.title.charAt(0)}</span>
                                        {book.year && (
                                            <span className="absolute bottom-2 right-2 text-[10px] font-bold text-[#5A4A42]/40">{book.year}</span>
                                        )}
                                        {book.isFavorite && (
                                            <div className="absolute top-2 right-2 text-red-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                                </svg>
                                            </div>
                                        )}
                                     </div>
                                     <span className="text-sm font-medium text-[#4A5D50] text-center line-clamp-2">{book.title}</span>
                                     <span className="text-xs text-[#888] font-bold">%{book.progress}</span>
                                </div>
                             ))}
                        </div>
                    </div>
                ))
            )}
        </div>

        {isAddModalOpen && (
            <AddBookModal 
                user={user}
                onClose={() => setIsAddModalOpen(false)} 
                onSave={handleAddBook} 
            />
        )}

    </div>
  );
};

export default LibraryPage;
