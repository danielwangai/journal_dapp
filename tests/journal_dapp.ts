import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JournalDapp } from "../target/types/journal_dapp";
import * as assert from "assert";
import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";

describe("journal_dapp", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.JournalDapp as Program<JournalDapp>;
  let bob = anchor.web3.Keypair.generate();
  let alice = anchor.web3.Keypair.generate();

  let bobJournalEntryPda: anchor.web3.PublicKey;

  let title1 = "My First Journal Entry";
  const title2 = "A day I'll never forget";
  const longTitle = "x".repeat(60) + Date.now().toString();
  const empty = "";
  const content1 = "My first entry in the journal!";
  const content2 = "It was a warm summer morning!";

  beforeEach(async () => {
    title1 = title1 + Date.now().toString();
    console.log("title: ", title1, title1.length);
    await airdrop(bob.publicKey);
    await airdrop(alice.publicKey);
    [bobJournalEntryPda] = getJournalEntryPDA(
      title1,
      bob.publicKey,
      program.programId,
    );

    const contentHash = hashContent(content1);

    await program.methods
      .createJournalEntry(title1, contentHash)
      .accounts({
        journalEntry: bobJournalEntryPda,
        owner: bob.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bob])
      .rpc();
  });

  describe("Add journal entry", async () => {
    it("creates a journal entry", async () => {
      const [pda] = getJournalEntryPDA(
        title1,
        alice.publicKey,
        program.programId,
      );

      let journalEntriesBefore = await program.account.journalEntry.all();
      let contentHash = hashContent(content1);

      await program.methods
        .createJournalEntry(title1, contentHash)
        .accounts({
          journalEntry: pda,
          owner: alice.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc();

      const journalEntry = await program.account.journalEntry.fetch(pda);
      assert.strictEqual(journalEntry.title, title1);
      let journalEntriesAfter = await program.account.journalEntry.all();

      assert.ok(journalEntriesAfter.length > journalEntriesBefore.length);
    });

    it("rejects title longer than 50 characters", async () => {
      await airdrop(bob.publicKey);
      try {
        const contentHash = hashContent(content2);
        let [pda] = getJournalEntryPDA(
          longTitle,
          bob.publicKey,
          program.programId,
        );
        await program.methods
          .createJournalEntry(longTitle, contentHash)
          .accounts({
            journalEntry: pda,
            owner: bob.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc({ commitment: "confirmed" });
      } catch (error) {
        const anchorError = anchor.AnchorError.parse(error.logs);
        assert.strictEqual(
          anchorError.error.errorCode.code,
          "TitleTooLong",
          "Expected 'TitleTooLong' error for content > 1000 chars",
        );
      }
    });
  });

  const airdrop = async (publicKey: anchor.web3.PublicKey) => {
    const sig = await program.provider.connection.requestAirdrop(
      publicKey,
      1_000_000_000, // 1 SOL
    );
    await program.provider.connection.confirmTransaction(sig, "confirmed");
  };

  const getJournalEntryPDA = (
    title: string,
    owner: PublicKey,
    programId: PublicKey,
  ) => {
    let hexString = crypto
      .createHash("sha256")
      .update(title, "utf-8")
      .digest("hex");
    let titleSeed = Uint8Array.from(Buffer.from(hexString, "hex"));
    return anchor.web3.PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("journal"), titleSeed, owner.toBuffer()],
      programId,
    );
  };

  const hashContent = (content: string) => {
    const hash = crypto.createHash("sha256").update(content, "utf8").digest();
    return Array.from(hash);
  };
});
