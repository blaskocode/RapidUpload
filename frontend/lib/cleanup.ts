/**
 * Utility functions to clear frontend data (localStorage)
 */

/**
 * Clears all upload-related data from localStorage
 * This includes:
 * - Upload queue state
 * - Upload status information
 * - Selected property ID
 */
export function clearUploadData(): void {
  try {
    // Clear the upload queue storage (used by Zustand persist middleware)
    localStorage.removeItem('upload-queue-storage');
    
    console.log('✅ Cleared upload data from localStorage');
    return;
  } catch (error) {
    console.error('❌ Error clearing upload data:', error);
    throw error;
  }
}

/**
 * Clears all localStorage data (use with caution!)
 */
export function clearAllLocalStorage(): void {
  try {
    localStorage.clear();
    console.log('✅ Cleared all localStorage data');
  } catch (error) {
    console.error('❌ Error clearing localStorage:', error);
    throw error;
  }
}

/**
 * Calls the backend cleanup endpoint to clear all server-side data
 * (DynamoDB tables and S3 bucket)
 */
export async function clearBackendData(): Promise<void> {
  try {
    const api = (await import('./api')).default;
    const response = await api.delete('/admin/cleanup');
    const result = response.data;

    if (result.success) {
      console.log('✅ Backend cleanup successful:', result.message);
      console.log(`   - S3 objects deleted: ${result.s3ObjectsDeleted}`);
      console.log(`   - Photos deleted: ${result.photosDeleted}`);
      console.log(`   - Properties deleted: ${result.propertiesDeleted}`);
    } else {
      console.error('❌ Backend cleanup failed:', result.message);
      throw new Error(result.message);
    }
  } catch (error: any) {
    console.error('❌ Error calling backend cleanup:', error);
    throw new Error(error.message || 'Failed to clear backend data');
  }
}

/**
 * Clears all data: both frontend (localStorage) and backend (DynamoDB + S3)
 */
export async function clearAllData(): Promise<void> {
  console.log('🧹 Starting complete data cleanup...');
  
  try {
    // Clear frontend data
    clearUploadData();
    
    // Clear backend data
    await clearBackendData();
    
    console.log('✅ Complete data cleanup finished successfully!');
  } catch (error) {
    console.error('❌ Error during complete cleanup:', error);
    throw error;
  }
}

// Make functions available globally for browser console usage
if (typeof window !== 'undefined') {
  (window as any).clearUploadData = clearUploadData;
  (window as any).clearAllLocalStorage = clearAllLocalStorage;
  (window as any).clearBackendData = clearBackendData;
  (window as any).clearAllData = clearAllData;
  
  console.log('🧹 Cleanup utilities available:');
  console.log('   - clearUploadData() - Clear upload queue from localStorage');
  console.log('   - clearAllLocalStorage() - Clear all localStorage');
  console.log('   - clearBackendData() - Clear DynamoDB and S3 data');
  console.log('   - clearAllData() - Clear everything (frontend + backend)');
}

