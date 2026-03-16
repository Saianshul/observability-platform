import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export const generatePDFAndSave = async (reportTitle, reportCategory, analystUsername, comment, combinedData, stats = [], chartImages = [], tablesHtml = []) => {
    
    const timestamp = new Date().toLocaleString();
    
    let statsHtml = '';
    if (stats.length > 0) {
        statsHtml = `
            <h2>Key Statistics</h2>
            <div class="stats-grid">
                ${stats.map(s => `
                    <div class="stat-card">
                        <div class="stat-label">${s.label}</div>
                        <div class="stat-value">${s.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let chartsHtml = '';
    if (chartImages.length > 0) {
        chartsHtml = `
            <h2>Visual Data</h2>
            <div class="charts-grid">
                ${chartImages.map(c => `
                    <div class="chart-card">
                        <h3>${c.title}</h3>
                        <img src="${c.image}" alt="${c.title}" />
                    </div>
                `).join('')}
            </div>
        `;
    }

    let tablesContentHtml = '';
    if (tablesHtml && tablesHtml.length > 0) {
        tablesContentHtml = `
            <h2>Data Tables</h2>
            <div class="tables-container">
                ${tablesHtml.map(t => `
                    <div class="table-wrapper">
                        <h3>${t.title}</h3>
                        ${t.html}
                    </div>
                `).join('')}
            </div>
        `;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${reportTitle}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
                h1 { border-bottom: 2px solid #2563eb; padding-bottom: 10px; color: #1e293b; }
                .meta { color: #64748b; font-size: 0.9em; margin-bottom: 30px; }
                .comment { background: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 30px; border-radius: 0 8px 8px 0; }
                h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                
                .stats-grid { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
                .stat-card { background: #1e293b; color: #f8fafc; padding: 20px; border-radius: 8px; flex: 1; min-width: 200px; text-align: center; }
                .stat-label { font-size: 0.85em; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 10px; }
                .stat-value { font-size: 2.5em; font-weight: bold; margin: 0; }
                
                .charts-grid { display: block; }
                .chart-card { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 30px; page-break-inside: avoid; }
                .chart-card h3 { color: #f8fafc; margin-top: 0; margin-bottom: 15px; font-size: 1.1em; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
                .chart-card img { width: 100%; height: auto; display: block; }

                .tables-container { margin-bottom: 30px; }
                .table-wrapper { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
                .table-wrapper h3 { margin-top: 0; color: #334155; }
                .data-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
                .data-table th, .data-table td { padding: 12px 15px; border-bottom: 1px solid #cbd5e1; text-align: left; }
                .data-table th { background-color: #e2e8f0; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.85em; }
            </style>
        </head>
        <body>
            <h1>Report: ${reportTitle}</h1>
            <div class="meta">
                <p><strong>Category:</strong> ${reportCategory.toUpperCase()}</p>
                <p><strong>Prepared By:</strong> Analyst @${analystUsername}</p>
                <p><strong>Date Generated:</strong> ${timestamp}</p>
            </div>
            
            <h2>Analyst Commentary</h2>
            <div class="comment">
                ${comment.replace(/\n/g, '<br>')}
            </div>

            ${statsHtml}
            ${chartsHtml}
            ${tablesContentHtml}
        </body>
        </html>
    `;

    const fileName = `report-${Date.now()}.pdf`;
    const relPath = `/reports/${fileName}`;
    const fullPath = path.resolve(`public${relPath}`);

    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
        path: fullPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    return relPath;
}
