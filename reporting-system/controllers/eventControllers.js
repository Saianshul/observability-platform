import * as eventModel from '../models/eventModel.js';

export const getAllEvents = async (req, res) => {
    try {
        const events = await eventModel.findAllEvents();
        res.status(200).json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getEvent = async (req, res) => {
    try {
        const event = await eventModel.findEventById(req.params.id);

        if (!event) {
            return res.status(404).json({ error: 'Event Not Found' });
        }

        res.status(200).json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createNewEvent = async (req, res) => {
    try {
        const { userId, sessionId, eventType, url, payload } = req.body;
        const newEvent = await eventModel.createEvent(userId, sessionId, eventType, url, payload);
        res.status(201).json(newEvent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const updateExistingEvent = async (req, res) => {
    try {
        const { userId, sessionId, eventType, url, payload } = req.body;
        const updatedEvent = await eventModel.updateEvent(req.params.id, userId, sessionId, eventType, url, payload);
        
        if (!updatedEvent) {
            return res.status(404).json({ error: 'Event Not Found' });
        }

        res.status(200).json(updatedEvent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteEvent = async (req, res) => {
    try {
        const deletedEvent = await eventModel.deleteEventById(req.params.id);

        if (!deletedEvent) {
            return res.status(404).json({ error: 'Event Not Found' });
        }

        res.status(200).json(deletedEvent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
