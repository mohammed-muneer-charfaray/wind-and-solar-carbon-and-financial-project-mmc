import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CalculatedResults } from '../types';
import { calculateSystemParameters } from './calculations';

export function exportToPDF(results: CalculatedResults, canvasElements: { [key: string]: HTMLCanvasElement }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 20;
  let yOffset = 20;

  // Title
  pdf.setFontSize(20);
  pdf.text('Solar & Wind Financial Analysis Report', pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 15;

  // Date and Time
  pdf.setFontSize(12);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yOffset);
  yOffset += 15;

  // System Parameters
  pdf.setFontSize(16);
  pdf.text('System Parameters', margin, yOffset);
  yOffset += 10;

  // Calculate reverse parameters
  const reverseCalculations = calculateSystemParameters(
    results.energyGeneration.daily,
    results.energyGeneration.monthly,
    results.energyGeneration.yearly,
    results.carbonReduction.yearly,
    0.95, // Default grid emission factor
    5 // Default daily production hours
  );

  const systemParams = [
    ['Calculated System Size', `${reverseCalculations.calculatedSystemSize.toFixed(2)} kW`],
    ['Calculated Capacity', `${reverseCalculations.calculatedCapacity.toFixed(2)} kW`]
  ];

  (pdf as any).autoTable({
    startY: yOffset,
    head: [['Parameter', 'Value']],
    body: systemParams,
    margin: { left: margin },
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });
  yOffset = (pdf as any).lastAutoTable.finalY + 15;

  // Financial Metrics
  pdf.setFontSize(16);
  pdf.text('Financial Metrics', margin, yOffset);
  yOffset += 10;

  const metrics = [
    ['Net Present Value (NPV)', `R ${results.financialMetrics.npv.toLocaleString()}`],
    ['Internal Rate of Return (IRR)', `${results.financialMetrics.irr.toFixed(2)}%`],
    ['Payback Period', `${results.financialMetrics.paybackPeriod.toFixed(2)} years`],
    ['Return on Investment (ROI)', `${results.financialMetrics.roi.toFixed(2)}%`],
    ['Levelized Cost of Energy (LCOE)', `R ${results.financialMetrics.lcoe.toFixed(2)}/kWh`]
  ];

  (pdf as any).autoTable({
    startY: yOffset,
    head: [['Metric', 'Value']],
    body: metrics,
    margin: { left: margin },
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });
  yOffset = (pdf as any).lastAutoTable.finalY + 15;

  // Add graphs with proper scaling and error handling
  Object.entries(canvasElements).forEach(([name, canvas]) => {
    if (yOffset + 80 > pdf.internal.pageSize.height) {
      pdf.addPage();
      yOffset = 20;
    }

    pdf.setFontSize(16);
    pdf.text(name, margin, yOffset);
    yOffset += 10;

    try {
      // Get the canvas data
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions while maintaining aspect ratio
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
      yOffset += imgHeight + 15;
    } catch (error) {
      console.error(`Failed to add ${name} graph to PDF:`, error);
      pdf.setTextColor(255, 0, 0);
      pdf.text(`Error: Could not generate ${name} graph`, margin, yOffset);
      pdf.setTextColor(0, 0, 0);
      yOffset += 10;
    }
  });

  // Energy Generation Table
  if (yOffset + 60 > pdf.internal.pageSize.height) {
    pdf.addPage();
    yOffset = 20;
  }

  pdf.setFontSize(16);
  pdf.text('Energy Generation', margin, yOffset);
  yOffset += 10;

  const energyData = [
    ['Daily Output', `${results.energyGeneration.daily.toFixed(2)} kWh`],
    ['Monthly Output', `${results.energyGeneration.monthly.toFixed(2)} kWh`],
    ['Yearly Output', `${results.energyGeneration.yearly.toFixed(2)} kWh`]
  ];

  (pdf as any).autoTable({
    startY: yOffset,
    head: [['Period', 'Energy Generated']],
    body: energyData,
    margin: { left: margin },
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });
  yOffset = (pdf as any).lastAutoTable.finalY + 15;

  // Carbon Reduction
  if (yOffset + 60 > pdf.internal.pageSize.height) {
    pdf.addPage();
    yOffset = 20;
  }

  pdf.setFontSize(16);
  pdf.text('Carbon Reduction', margin, yOffset);
  yOffset += 10;

  const carbonData = [
    ['Daily Reduction', `${results.carbonReduction.daily.toFixed(2)} kg CO₂`],
    ['Yearly Reduction', `${results.carbonReduction.yearly.toFixed(2)} kg CO₂`],
    ['Lifetime Reduction', `${results.carbonReduction.lifetime.toFixed(2)} kg CO₂`],
    ['Financial Benefit', `R ${results.carbonReduction.financialBenefit.toLocaleString()}`]
  ];

  (pdf as any).autoTable({
    startY: yOffset,
    head: [['Metric', 'Value']],
    body: carbonData,
    margin: { left: margin },
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });

  // Add yearly breakdown if space allows
  if (yOffset + 100 <= pdf.internal.pageSize.height) {
    yOffset = (pdf as any).lastAutoTable.finalY + 15;
    
    const yearlyData = results.carbonReduction.yearlyReduction.map(yr => [
      `Year ${yr.year}`,
      `${yr.reduction.toFixed(2)} kg CO₂`
    ]);

    (pdf as any).autoTable({
      startY: yOffset,
      head: [['Year', 'Carbon Reduction']],
      body: yearlyData,
      margin: { left: margin },
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 }
    });
  }

  // Save the PDF
  pdf.save('solar-wind-analysis.pdf');
}