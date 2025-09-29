import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OCRService } from "./ocr-service";
import { insertAccountHolderSchema, insertBettingHouseSchema, insertSurebetSetSchema, insertBetSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDF documents are allowed'));
    }
  }
});

const ocrService = new OCRService(process.env.MISTRAL_API_KEY!);

export async function registerRoutes(app: Express): Promise<Server> {
  // Account Holders routes
  app.get("/api/account-holders", async (req, res) => {
    try {
      const accountHolders = await storage.getAccountHolders();
      res.json(accountHolders);
    } catch (error) {
      console.error("Error fetching account holders:", error);
      res.status(500).json({ error: "Failed to fetch account holders" });
    }
  });

  app.post("/api/account-holders", async (req, res) => {
    try {
      const data = insertAccountHolderSchema.parse(req.body);
      const accountHolder = await storage.createAccountHolder(data);
      res.json(accountHolder);
    } catch (error) {
      console.error("Error creating account holder:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create account holder" });
      }
    }
  });

  app.put("/api/account-holders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertAccountHolderSchema.partial().parse(req.body);
      const accountHolder = await storage.updateAccountHolder(id, data);
      res.json(accountHolder);
    } catch (error) {
      console.error("Error updating account holder:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else if (error instanceof Error && error.message === 'Account holder not found') {
        res.status(404).json({ error: "Account holder not found" });
      } else {
        res.status(500).json({ error: "Failed to update account holder" });
      }
    }
  });

  app.delete("/api/account-holders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAccountHolder(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account holder:", error);
      res.status(500).json({ error: "Failed to delete account holder" });
    }
  });

  // Betting Houses routes
  app.get("/api/betting-houses", async (req, res) => {
    try {
      const { accountHolderId } = req.query;
      let bettingHouses;
      
      if (accountHolderId) {
        bettingHouses = await storage.getBettingHousesByHolder(accountHolderId as string);
      } else {
        bettingHouses = await storage.getBettingHouses();
      }
      
      res.json(bettingHouses);
    } catch (error) {
      console.error("Error fetching betting houses:", error);
      res.status(500).json({ error: "Failed to fetch betting houses" });
    }
  });

  app.post("/api/betting-houses", async (req, res) => {
    try {
      const data = insertBettingHouseSchema.parse(req.body);
      const bettingHouse = await storage.createBettingHouse(data);
      res.json(bettingHouse);
    } catch (error) {
      console.error("Error creating betting house:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create betting house" });
      }
    }
  });

  app.put("/api/betting-houses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertBettingHouseSchema.partial().parse(req.body);
      const bettingHouse = await storage.updateBettingHouse(id, data);
      res.json(bettingHouse);
    } catch (error) {
      console.error("Error updating betting house:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else if (error instanceof Error && error.message === 'Betting house not found') {
        res.status(404).json({ error: "Betting house not found" });
      } else {
        res.status(500).json({ error: "Failed to update betting house" });
      }
    }
  });

  app.delete("/api/betting-houses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBettingHouse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting betting house:", error);
      res.status(500).json({ error: "Failed to delete betting house" });
    }
  });

  // Surebet Sets routes
  app.get("/api/surebet-sets", async (req, res) => {
    try {
      const surebetSets = await storage.getSurebetSets();
      res.json(surebetSets);
    } catch (error) {
      console.error("Error fetching surebet sets:", error);
      res.status(500).json({ error: "Failed to fetch surebet sets" });
    }
  });

  app.get("/api/surebet-sets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const surebetSet = await storage.getSurebetSetById(id);
      if (!surebetSet) {
        res.status(404).json({ error: "Surebet set not found" });
        return;
      }
      res.json(surebetSet);
    } catch (error) {
      console.error("Error fetching surebet set:", error);
      res.status(500).json({ error: "Failed to fetch surebet set" });
    }
  });

  app.post("/api/surebet-sets", async (req, res) => {
    try {
      const { surebetSet, bets: setBets } = req.body;
      
      // Validate surebet set data
      const surebetData = insertSurebetSetSchema.parse(surebetSet);
      
      // Create the surebet set first
      const createdSet = await storage.createSurebetSet(surebetData);
      
      // Validate and create the associated bets
      const createdBets = [];
      for (const betData of setBets) {
        const validatedBet = insertBetSchema.parse({
          ...betData,
          surebetSetId: createdSet.id
        });
        const createdBet = await storage.createBet(validatedBet);
        createdBets.push(createdBet);
      }
      
      res.json({
        surebetSet: createdSet,
        bets: createdBets
      });
    } catch (error) {
      console.error("Error creating surebet set:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create surebet set" });
      }
    }
  });

  app.put("/api/surebet-sets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertSurebetSetSchema.partial().parse(req.body);
      const surebetSet = await storage.updateSurebetSet(id, data);
      res.json(surebetSet);
    } catch (error) {
      console.error("Error updating surebet set:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else if (error instanceof Error && error.message === 'Surebet set not found') {
        res.status(404).json({ error: "Surebet set not found" });
      } else {
        res.status(500).json({ error: "Failed to update surebet set" });
      }
    }
  });

  app.delete("/api/surebet-sets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSurebetSet(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting surebet set:", error);
      res.status(500).json({ error: "Failed to delete surebet set" });
    }
  });

  // Individual Bet operations
  app.put("/api/bets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertBetSchema.partial().parse(req.body);
      const bet = await storage.updateBet(id, data);
      res.json(bet);
    } catch (error) {
      console.error("Error updating bet:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else if (error instanceof Error && error.message === 'Bet not found') {
        res.status(404).json({ error: "Bet not found" });
      } else {
        res.status(500).json({ error: "Failed to update bet" });
      }
    }
  });

  // OCR processing route - accepts file and optional custom prompt
  app.post("/api/ocr/process", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      // Extract custom prompt from request body (if provided)
      const customPrompt = req.body.prompt || null;
      const fileType = req.file.mimetype === 'application/pdf' ? 'PDF' : 'Image';
      
      console.log(`Processing ${fileType} with Pixtral Large: ${req.file.originalname}, size: ${req.file.size} bytes`);
      console.log(`Custom prompt provided: ${customPrompt ? 'Yes' : 'No'}`);
      
      const ocrResult = await ocrService.processFileFromBuffer(req.file.buffer, req.file.mimetype, customPrompt);
      
      res.json({
        success: true,
        data: ocrResult
      });
    } catch (error) {
      console.error("Pixtral Large OCR processing error:", error);
      res.status(400).json({ 
        error: "Failed to process OCR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}