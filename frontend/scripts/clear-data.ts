/**
 * Script to clear all frontend localStorage data
 * Run this in the browser console or before starting development
 */

export function clearAllFrontendData() {
  console.log('🧹 Clearing all frontend data...');
  
  // Clear upload queue storage
  localStorage.removeItem('upload-queue-storage');
  
  // Clear any other taskmaster or app-specific items
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`  Removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log('✅ Frontend data cleared!');
  console.log('   Please refresh the page.');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🧹 Data clearing utility loaded.');
  console.log('   Run: clearAllFrontendData()');
  (window as any).clearAllFrontendData = clearAllFrontendData;
}

