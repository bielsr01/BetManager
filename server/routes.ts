import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { bets } from "@shared/schema";
import { eq } from "drizzle-orm";
import { PdfPlumberService } from "./pdf-plumber-service";
import { insertAccountHolderSchema, insertBettingHouseSchema, insertSurebetSetSchema, insertBetSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed'));
    }
  }
});

const pdfPlumberService = new PdfPlumberService();

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
      const updateData = insertBetSchema.partial().parse(req.body);
      
      const updatedBet = await storage.updateBet(id, updateData);
      
      // If odd or stake is updated, recalculate profit potential for both bets
      if (updatedBet.surebetSetId && (updateData.odd !== undefined || updateData.stake !== undefined)) {
        const allBets = await db.select().from(bets).where(eq(bets.surebetSetId, updatedBet.surebetSetId));
        
        if (allBets.length === 2) {
          const bet1 = allBets[0];
          const bet2 = allBets[1];
          
          // Calculate profit potential: (stake1 × odd1) - stake1 - stake2
          const profitPotential1 = (parseFloat(String(bet1.stake)) * parseFloat(String(bet1.odd))) - parseFloat(String(bet1.stake)) - parseFloat(String(bet2.stake));
          const profitPotential2 = (parseFloat(String(bet2.stake)) * parseFloat(String(bet2.odd))) - parseFloat(String(bet2.stake)) - parseFloat(String(bet1.stake));
          
          // Update both bets with recalculated profit potential
          await storage.updateBet(bet1.id, { potentialProfit: String(profitPotential1) });
          await storage.updateBet(bet2.id, { potentialProfit: String(profitPotential2) });
        }
      }
      
      // Check if both bets in the surebet set have results and calculate actual profit
      if (updatedBet.surebetSetId && updateData.result) {
        const allBets = await db.select().from(bets).where(eq(bets.surebetSetId, updatedBet.surebetSetId));
        const allHaveResults = allBets.every(b => b.result != null);
        
        if (allHaveResults && allBets.length === 2) {
          const bet1 = allBets[0];
          const bet2 = allBets[1];
          let actualProfit = 0;
          
          // Calculate actual profit based on both bet results
          if (bet1.result === "won" && bet2.result === "lost") {
            actualProfit = (parseFloat(String(bet1.stake)) * parseFloat(String(bet1.odd))) - parseFloat(String(bet2.stake)) - parseFloat(String(bet1.stake));
          } else if (bet2.result === "won" && bet1.result === "lost") {
            actualProfit = (parseFloat(String(bet2.stake)) * parseFloat(String(bet2.odd))) - parseFloat(String(bet1.stake)) - parseFloat(String(bet2.stake));
          } else if (bet1.result === "won" && bet2.result === "returned") {
            actualProfit = (parseFloat(String(bet1.stake)) * parseFloat(String(bet1.odd))) - parseFloat(String(bet1.stake)) + parseFloat(String(bet2.stake));
          } else if (bet2.result === "won" && bet1.result === "returned") {
            actualProfit = (parseFloat(String(bet2.stake)) * parseFloat(String(bet2.odd))) - parseFloat(String(bet2.stake)) + parseFloat(String(bet1.stake));
          } else if (bet1.result === "lost" && bet2.result === "returned") {
            actualProfit = -parseFloat(String(bet1.stake)); // Perdeu apenas o stake da casa que perdeu
          } else if (bet2.result === "lost" && bet1.result === "returned") {
            actualProfit = -parseFloat(String(bet2.stake)); // Perdeu apenas o stake da casa que perdeu
          } else if (bet1.result === "won" && bet2.result === "won") {
            actualProfit = (parseFloat(String(bet1.stake)) * parseFloat(String(bet1.odd)) + parseFloat(String(bet2.stake)) * parseFloat(String(bet2.odd))) - (parseFloat(String(bet1.stake)) + parseFloat(String(bet2.stake)));
          } else if (bet1.result === "lost" && bet2.result === "lost") {
            actualProfit = -(parseFloat(String(bet1.stake)) + parseFloat(String(bet2.stake)));
          } else if (bet1.result === "returned" && bet2.result === "returned") {
            actualProfit = 0;
          }
          
          // Update both bets with the calculated actual profit
          await storage.updateBet(bet1.id, { actualProfit: String(actualProfit) });
          await storage.updateBet(bet2.id, { actualProfit: String(actualProfit) });
          
          // Update surebet set status to resolved
          await storage.updateSurebetSet(updatedBet.surebetSetId, { status: "resolved" });
        }
      }
      
      res.json(updatedBet);
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

  // Update surebet set status
  app.patch("/api/surebet-sets/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = z.object({ status: z.enum(["pending", "checked", "resolved"]) }).parse(req.body);
      
      const updatedSet = await storage.updateSurebetSet(id, { status });
      res.json(updatedSet);
    } catch (error: any) {
      console.error("Error updating surebet set status:", error);
      res.status(400).json({ error: error.message || "Invalid request data" });
    }
  });

  // Reset surebet set results
  app.post("/api/surebet-sets/:id/reset", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get all bets for this surebet set
      const allBets = await db.select().from(bets).where(eq(bets.surebetSetId, id));
      
      // Reset all bets
      for (const bet of allBets) {
        await storage.updateBet(bet.id, { 
          result: null, 
          actualProfit: null 
        });
      }
      
      // Reset surebet set status to pending
      const updatedSet = await storage.updateSurebetSet(id, { status: "pending" });
      
      res.json(updatedSet);
    } catch (error: any) {
      console.error("Error resetting surebet set:", error);
      res.status(500).json({ error: error.message || "Failed to reset surebet set" });
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
      console.log(`AI OCR disabled; using pdfplumber for PDF processing`);
      
      const ocrResult = await pdfPlumberService.processDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        customPrompt
      );
      
      res.json({
        success: true,
        data: ocrResult
      });
    } catch (error) {
      console.error("pdfplumber processing error:", error);
      res.status(400).json({ 
        error: "Failed to process OCR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}