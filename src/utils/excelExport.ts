import XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SoldItemHistory } from '../api/product.api';

/**
 * Formats a number to 2 decimal places or returns '-' if invalid.
 */
const formatNumber = (val: string | number | null | undefined): number => {
  if (val == null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
};

/**
 * Generates an Excel spreadsheet with:
 * 1. Daily Sales Summary
 * 2. Weekly Sales Summary
 * 3. Monthly Sales Summary
 * 4. Raw Sales Data
 * and opens the native share sheet to save or share it.
 */
export const exportSalesToExcel = async (sales: SoldItemHistory[]) => {
  if (!sales || sales.length === 0) {
    throw new Error('No sales history available to export.');
  }

  // 1. Raw sales sheet data
  const rawData = sales.map((item) => ({
    'Invoice Number': item.invoice_number || 'N/A',
    'Date': item.invoice_date || new Date(item.selling_datetime).toLocaleDateString('en-IN'),
    'Time': new Date(item.selling_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    'Brand': item.product_brand,
    'Model': item.product_model,
    'SKU': item.product_sku,
    'Barcode': item.product_barcode || 'N/A',
    'IMEI 1': item.imei_no_1 || 'N/A',
    'IMEI 2': item.imei_no_2 || 'N/A',
    'Customer Name': item.customer_name || 'Walk-in',
    'Customer Contact': item.customer_contact || 'N/A',
    'Payment Mode': (item.payment_mode || 'cash').toUpperCase(),
    'Amount (INR)': formatNumber(item.total_amount),
  }));

  // 2. Daily Sales Grouping
  const dailyMap = new Map<string, { count: number; revenue: number }>();
  sales.forEach((item) => {
    const dateStr = item.invoice_date || new Date(item.selling_datetime).toLocaleDateString('en-IN');
    const amount = formatNumber(item.total_amount);
    const current = dailyMap.get(dateStr) || { count: 0, revenue: 0 };
    dailyMap.set(dateStr, {
      count: current.count + 1,
      revenue: current.revenue + amount,
    });
  });
  const dailyData = Array.from(dailyMap.entries()).map(([date, stats]) => ({
    'Date': date,
    'Total Products Sold': stats.count,
    'Total Revenue (INR)': stats.revenue,
  })).sort((a, b) => {
    // Attempt sorting by date descending
    const partsA = a.Date.split('/');
    const partsB = b.Date.split('/');
    if (partsA.length === 3 && partsB.length === 3) {
      const dateA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0]));
      const dateB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0]));
      return dateB.getTime() - dateA.getTime();
    }
    return b.Date.localeCompare(a.Date);
  });

  // 3. Weekly Sales Grouping
  const weeklyMap = new Map<string, { count: number; revenue: number }>();
  sales.forEach((item) => {
    const date = new Date(item.selling_datetime);
    // Find Sunday of the week
    const first = date.getDate() - date.getDay();
    const sunday = new Date(new Date(item.selling_datetime).setDate(first));
    const saturday = new Date(new Date(item.selling_datetime).setDate(first + 6));
    
    const weekStr = `${sunday.toLocaleDateString('en-IN')} to ${saturday.toLocaleDateString('en-IN')}`;
    const amount = formatNumber(item.total_amount);
    const current = weeklyMap.get(weekStr) || { count: 0, revenue: 0 };
    weeklyMap.set(weekStr, {
      count: current.count + 1,
      revenue: current.revenue + amount,
    });
  });
  const weeklyData = Array.from(weeklyMap.entries()).map(([week, stats]) => ({
    'Week Range': week,
    'Total Products Sold': stats.count,
    'Total Revenue (INR)': stats.revenue,
  }));

  // 4. Monthly Sales Grouping
  const monthlyMap = new Map<string, { count: number; revenue: number }>();
  sales.forEach((item) => {
    const date = new Date(item.selling_datetime);
    const monthStr = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const amount = formatNumber(item.total_amount);
    const current = monthlyMap.get(monthStr) || { count: 0, revenue: 0 };
    monthlyMap.set(monthStr, {
      count: current.count + 1,
      revenue: current.revenue + amount,
    });
  });
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, stats]) => ({
    'Month': month,
    'Total Products Sold': stats.count,
    'Total Revenue (INR)': stats.revenue,
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create sheets
  const rawSheet = XLSX.utils.json_to_sheet(rawData);
  const dailySheet = XLSX.utils.json_to_sheet(dailyData);
  const weeklySheet = XLSX.utils.json_to_sheet(weeklyData);
  const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);

  // Append sheets
  XLSX.utils.book_append_sheet(wb, dailySheet, 'Daily Sales');
  XLSX.utils.book_append_sheet(wb, weeklySheet, 'Weekly Sales');
  XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly Sales');
  XLSX.utils.book_append_sheet(wb, rawSheet, 'Raw Sales Data');

  // Write file
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const uri = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Share file
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export Sales Data',
      UTI: 'com.microsoft.excel.xlsx',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
};
