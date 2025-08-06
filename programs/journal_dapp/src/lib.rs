use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("71iBVGZLuWzemewsXTEydY652dxChTjrY1jZwJdmAbGn");

const TITLE_MAX_LEN: usize = 50;
const JOURNAL_ENTRY_SEED: &str = "journal";

#[error_code]
pub enum ErrorCode {
    #[msg("Title must be 50 characters or less")]
    TitleTooLong,
    #[msg("Content must be 1000 characters or less")]
    ContentTooLong,
    #[msg("Title must be provided")]
    TitleRequired,
}

#[program]
pub mod journal_dapp {
    use super::*;

    pub fn create_journal_entry(
        ctx: Context<CreateEntry>,
        title: String,
        content_hash: [u8; 32],
    ) -> Result<()> {
        // validations
        if title.chars().count() == 0 {
            return Err(ErrorCode::TitleRequired.into());
        }
        if title.chars().count() > TITLE_MAX_LEN {
            return Err(ErrorCode::TitleTooLong.into());
        }

        let journal_entry = &mut ctx.accounts.journal_entry;
        journal_entry.title = title;
        journal_entry.content_hash = content_hash;
        journal_entry.owner = ctx.accounts.owner.key();
        journal_entry.created_at = Clock::get()?.unix_timestamp;
        journal_entry.bump = ctx.bumps.journal_entry;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title: String)] // title being used in CreateEntry is passed from the instruction
pub struct CreateEntry<'info> {
    #[account(
        init,
        seeds = [JOURNAL_ENTRY_SEED.as_bytes(), {hash(title.as_bytes()).to_bytes().as_ref()},owner.key().as_ref()],// define PDA
        bump,
        space = 8 + JournalEntry::INIT_SPACE,
        payer = owner
    )]
    pub journal_entry: Account<'info, JournalEntry>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct JournalEntry {
    pub owner: Pubkey,
    #[max_len(TITLE_MAX_LEN)]
    pub title: String,
    pub content_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}
