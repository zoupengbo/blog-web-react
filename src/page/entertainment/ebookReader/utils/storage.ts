import { STORAGE_KEYS } from '../constants';
import { Book, ReadingProgress, ReaderSettings } from '../types';

// 本地存储工具类
export class StorageUtil {
  // 获取书架数据
  static getBookshelf(): Book[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKSHELF);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取书架数据失败:', error);
      return [];
    }
  }

  // 保存书架数据
  static saveBookshelf(books: Book[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKSHELF, JSON.stringify(books));
    } catch (error) {
      console.error('保存书架数据失败:', error);
    }
  }

  // 添加书籍到书架
  static addBookToShelf(book: Book): void {
    const books = this.getBookshelf();
    const exists = books.some(b => b.id === book.id);
    if (!exists) {
      books.unshift({ ...book, addedTime: new Date().toISOString() });
      this.saveBookshelf(books);
    }
  }

  // 从书架移除书籍
  static removeBookFromShelf(bookId: string): void {
    const books = this.getBookshelf();
    const filteredBooks = books.filter(book => book.id !== bookId);
    this.saveBookshelf(filteredBooks);
  }

  // 获取阅读进度
  static getReadingProgress(bookId: string): ReadingProgress | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
      const allProgress = data ? JSON.parse(data) : {};
      return allProgress[bookId] || null;
    } catch (error) {
      console.error('获取阅读进度失败:', error);
      return null;
    }
  }

  // 保存阅读进度
  static saveReadingProgress(progress: ReadingProgress): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
      const allProgress = data ? JSON.parse(data) : {};
      allProgress[progress.bookId] = progress;
      localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(allProgress));
    } catch (error) {
      console.error('保存阅读进度失败:', error);
    }
  }

  // 获取阅读设置
  static getReaderSettings(): ReaderSettings | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.READER_SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('获取阅读设置失败:', error);
      return null;
    }
  }

  // 保存阅读设置
  static saveReaderSettings(settings: ReaderSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('保存阅读设置失败:', error);
    }
  }

  // 获取搜索历史
  static getSearchHistory(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取搜索历史失败:', error);
      return [];
    }
  }

  // 添加搜索历史
  static addSearchHistory(keyword: string): void {
    try {
      const history = this.getSearchHistory();
      const filteredHistory = history.filter(item => item !== keyword);
      filteredHistory.unshift(keyword);
      // 只保留最近20条搜索记录
      const limitedHistory = filteredHistory.slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  }

  // 清空搜索历史
  static clearSearchHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      console.error('清空搜索历史失败:', error);
    }
  }

  // 检查书籍是否在书架中
  static isBookInShelf(bookId: string): boolean {
    const books = this.getBookshelf();
    return books.some(book => book.id === bookId);
  }

  // 更新书籍信息
  static updateBookInShelf(bookId: string, updates: Partial<Book>): void {
    const books = this.getBookshelf();
    const index = books.findIndex(book => book.id === bookId);
    if (index !== -1) {
      books[index] = { ...books[index], ...updates };
      this.saveBookshelf(books);
    }
  }
}
