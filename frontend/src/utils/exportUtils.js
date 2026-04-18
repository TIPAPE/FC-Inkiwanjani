/**
 * Export utilities for PDF and CSV file generation and download.
 * Provides cross-platform file creation and sharing capabilities.
 */

import { Platform, Alert, ToastAndroid } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

/**
 * Generate and export CSV file
 * @param {string} csvContent - CSV content as string
 * @param {string} fileName - Name of the file (with .csv extension)
 * @returns {Promise<boolean>} - Success status
 */
export const exportCSV = async (csvContent, fileName) => {
  try {
    if (!csvContent || typeof csvContent !== 'string') {
      throw new Error('Invalid CSV content');
    }

    if (!fileName || !fileName.endsWith('.csv')) {
      fileName = fileName ? `${fileName}.csv` : 'report.csv';
    }

    // Show loading indicator
    if (Platform.OS === 'android') {
      ToastAndroid.show('Generating CSV...', ToastAndroid.SHORT);
    }

    // Get the document directory path
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Write the CSV file to the app's document directory
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file using Expo's sharing API
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text', // iOS
      });
    } else {
      // If sharing is not available, show file location
      Alert.alert(
        'CSV File Saved',
        `File saved to: ${fileUri}`,
        [{ text: 'OK' }]
      );
    }

    return true;
  } catch (error) {
    console.error('CSV Export Error:', error);
    Alert.alert(
      'Export Failed',
      `Failed to export CSV: ${error.message}`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Generate and export PDF file from HTML content
 * @param {string} htmlContent - HTML content for the PDF
 * @param {string} fileName - Name of the file (without extension)
 * @returns {Promise<boolean>} - Success status
 */
export const exportPDF = async (htmlContent, fileName) => {
  try {
    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('Invalid HTML content');
    }

    if (!fileName) {
      fileName = 'report';
    }

    // Show loading indicator
    if (Platform.OS === 'android') {
      ToastAndroid.show('Generating PDF...', ToastAndroid.SHORT);
    }

    // Use expo-print to generate PDF
    const { uri, base64 } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    if (!uri) {
      throw new Error('Failed to generate PDF');
    }

    // Rename the file with proper name
    const pdfFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const newUri = uri.split('/').slice(0, -1).join('/') + '/' + pdfFileName;
    
    // Move/rename the file
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    // Share the PDF file
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf', // iOS
      });
    } else {
      // If sharing is not available, show file location
      Alert.alert(
        'PDF File Saved',
        `File saved to: ${newUri}`,
        [{ text: 'OK' }]
      );
    }

    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    Alert.alert(
      'Export Failed',
      `Failed to export PDF: ${error.message}`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Download file from URL and save to device
 * @param {string} url - URL to download from
 * @param {string} fileName - Name of the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<boolean>} - Success status
 */
export const downloadFile = async (url, fileName, mimeType = 'application/octet-stream') => {
  try {
    if (!url || !fileName) {
      throw new Error('URL and filename are required');
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show('Downloading file...', ToastAndroid.SHORT);
    }

    // Download the file
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      `${FileSystem.documentDirectory}${fileName}`,
      {}
    );

    const { uri } = await downloadResumable.downloadAsync();

    if (!uri) {
      throw new Error('Download failed');
    }

    // Share the file
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType,
      });
    } else {
      Alert.alert(
        'File Saved',
        `File saved to: ${uri}`,
        [{ text: 'OK' }]
      );
    }

    return true;
  } catch (error) {
    console.error('Download Error:', error);
    Alert.alert(
      'Download Failed',
      `Failed to download file: ${error.message}`,
      [{ text: 'OK' }]
    );
    return false;
  }
};