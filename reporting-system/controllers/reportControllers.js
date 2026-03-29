import * as eventModel from '../models/eventModel.js';
import * as logModel from '../models/logModel.js';
import * as reportModel from '../models/reportModel.js';
import { generatePDFAndSave } from '../services/pdfService.js';

const getCombinedData = async (options = {}) => {
    const events = await eventModel.findAllEvents(options);
    const logs = await logModel.findAllLogs(options);
    return { events, logs };
};

export const getPerformanceData = async (req, res) => {
    try {
        const { events, logs } = await getCombinedData(req.query);

        const perfEvents = events.filter(e => e.event_type === 'pageview' || e.event_type === 'vitals');

        const serverDelays = logs.map(l => ({
            timestamp: l.timestamp,
            servingTime: l.request_serving_time_microseconds,
            path: l.path
        }));

        res.status(200).json({ browser: perfEvents, server: serverDelays });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getBehavioralData = async (req, res) => {
    try {
        const { events, logs } = await getCombinedData(req.query);

        const behaviorEvents = events.filter(e => e.event_type === 'activity');

        const pathCounts = {};
        logs.forEach(l => {
            const path = l.path;
            pathCounts[path] = (pathCounts[path] || 0) + 1;
        });

        res.status(200).json({ events: behaviorEvents, paths: pathCounts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getAudienceData = async (req, res) => {
    try {
        const { logs } = await getCombinedData(req.query);

        const platforms = {};
        const formFactors = {};
        const models = {};

        logs.forEach(l => {
            if (l.platform && l.platform !== '-') {
                platforms[l.platform] = (platforms[l.platform] || 0) + 1;
            }
            if (l.form_factors && l.form_factors !== '-') {
                formFactors[l.form_factors] = (formFactors[l.form_factors] || 0) + 1;
            }
            if (l.model && l.model !== '-') {
                models[l.model] = (models[l.model] || 0) + 1;
            }
        });

        res.status(200).json({ platforms, formFactors, models });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getErrorData = async (req, res) => {
    try {
        const { events, logs } = await getCombinedData(req.query);

        const browserErrors = events.filter(e => e.event_type === 'error' || e.event_type === 'unhandled_rejection');

        const serverErrors = logs.filter(l => l.status_code >= 400);

        res.status(200).json({ browser: browserErrors, server: serverErrors });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getReportingDashboard = async (req, res) => {
    try {
        const { events, logs } = await getCombinedData(req.query);

        res.render('dashboard', {
            user: req.user,
            events: events,
            logs: logs,
            trackedSiteUrl: process.env.TRACKED_SITE_URL
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading the dashboard data.');
    }
}

export const createSavedReport = async (req, res) => {
    try {
        const { title, category, comment, combinedData, stats, chartImages, tablesHtml } = req.body;

        const filePath = await generatePDFAndSave(title, category, req.user.username, comment, combinedData, stats, chartImages, tablesHtml);

        const newReport = await reportModel.createReport(title, category, comment, filePath, req.user.id);

        res.status(201).json(newReport);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getSavedReports = async (req, res) => {
    try {
        const reports = await reportModel.findAllReports();

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json(reports);
        }

        res.render('reports', {
            user: req.user,
            reports: reports
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteSavedReport = async (req, res) => {
    try {
        const { id } = req.params;

        const report = await reportModel.findReportById(id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (report.file_path) {
            const fs = await import('fs');
            const path = await import('path');
            
            const fullPath = path.resolve(`public${report.file_path}`);
            
            try {
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (fsErr) {
                console.error(`Failed to delete physical PDF file for report ${id}:`, fsErr);
            }
        }

        await reportModel.deleteReportById(id);

        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
