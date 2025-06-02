---
description: You are an expert in Solana program development, focusing on building and deploying smart contracts using Rust and Anchor, and integrating on-chain data with Web3.js and Metaplex.
globs: 
alwaysApply: false
---
# Solana Program Development Excellence Guide

## 🚀 Core Principles

- **Security-First Mindset**: Design with security as the primary concern, not a post-implementation consideration
- **Performance Optimization**: Write programs that minimize compute units and transaction costs
- **Clean Architecture**: Create modular, testable, and maintainable code structures
- **Comprehensive Testing**: Test for both expected behavior and edge cases/attack vectors

## 📝 Solana Program Architecture

### Program Structure
```rust
use anchor_lang::prelude::*;

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: InitializeParams) -> Result<()> {
        // Validate inputs first
        require!(data.value > 0, MyError::InvalidValue);

        // Set account data
        let account = &mut ctx.accounts.my_account;
        account.authority = ctx.accounts.authority.key();
        account.value = data.value;

        // Emit event for indexers
        emit!(AccountInitialized {
            account: account.key(),
            authority: account.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MyAccount::SPACE,
        seeds = [b"my-account", authority.key().as_ref()],
        bump
    )]
    pub my_account: Account<'info, MyAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct MyAccount {
    pub authority: Pubkey,    // 32 bytes
    pub value: u64,           // 8 bytes
}

impl MyAccount {
    pub const SPACE: usize = 32 + 8;
}

#[event]
pub struct AccountInitialized {
    pub account: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum MyError {
    #[msg("Value must be greater than zero")]
    InvalidValue,
}
```

### Account Management Best Practices

- **PDA Derivation**: Use consistent and collision-resistant seed patterns
  ```rust
  // Recommended pattern for deriving PDAs
  #[account(
      seeds = [
          b"user-stats",
          user.key().as_ref(),
          &[game_id.to_le_bytes()].as_ref()
      ],
      bump
  )]
  ```

- **Space Calculation**: Always explicitly calculate account space
  ```rust
  // Define space constants in your account structs
  impl UserProfile {
      pub const MAXIMUM_NAME_LENGTH: usize = 32;
      pub const SPACE: usize =
          8 +                 // discriminator
          32 +                // pubkey
          4 + Self::MAXIMUM_NAME_LENGTH + // String length prefix + max bytes
          8;                  // u64 value
  }
  ```

- **Proper Reinitialization Prevention**:
  ```rust
  #[account(
      init_if_needed,
      payer = user,
      space = 8 + UserAccount::SPACE,
      seeds = [...],
      bump,
      constraint = !user_account.is_initialized || user_account.authority == user.key() @ ProgramError::AccountAlreadyInitialized
  )]
  ```

## 🔒 Security Patterns

### Input Validation

```rust
// Always validate inputs
pub fn process_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Validate non-zero amount
    require!(amount > 0, ErrorCode::InvalidAmount);

    // Validate amount doesn't exceed user balance
    require!(
        amount <= ctx.accounts.user_token_account.amount,
        ErrorCode::InsufficientFunds
    );

    // Continue with deposit logic...
    Ok(())
}
```

### Authority Checks

```rust
// Always verify authority before state changes
#[account(
    mut,
    seeds = [b"vault", authority.key().as_ref()],
    bump,
    has_one = authority @ ErrorCode::Unauthorized
)]
pub vault: Account<'info, Vault>,
pub authority: Signer<'info>,
```

### Reentrancy Protection

```rust
// For multi-instruction transactions with external calls
#[account(
    mut,
    constraint = !pool.locked @ ErrorCode::PoolLocked,
)]
pub pool: Account<'info, Pool>,

// Then in instruction
pool.locked = true;
// ... perform external calls ...
pool.locked = false;
```

### Common Vulnerabilities Checklist

- **✅ Signer Verification**: All privileged operations require proper signers
- **✅ Ownership Validation**: Verify program ownership of all non-signer accounts
- **✅ Integer Overflow**: Use checked arithmetic operations (checked_add, checked_sub)
- **✅ Instruction Sandboxing**: Properly handle CPIs with restricted privileges
- **✅ Data Validation**: Validate all deserialized data before use

## ⚡ Performance Optimization

### Compute Unit Reduction

- Minimize account loading by using `AccountInfo` for accounts only needed for verification
- Use references instead of cloning data structures
- Batch operations when possible to reduce transaction count

```rust
// ❌ Inefficient: Loads full accounts when only keys needed
pub struct VerifyAccounts<'info> {
    pub account_1: Account<'info, SomeType>,
    pub account_2: Account<'info, SomeType>,
}

// ✅ Efficient: Uses AccountInfo when full deserialization isn't needed
pub struct VerifyAccounts<'info> {
    pub account_1: AccountInfo<'info>,
    pub account_2: AccountInfo<'info>,
}
```

### Memory Optimization

```rust
// Pre-allocate vectors with expected capacity
let mut vec = Vec::with_capacity(expected_size);

// Use &str instead of String when possible
fn process_name(name: &str) -> Result<()> {
    // work with name without owning it
    Ok(())
}
```

## 🔄 Cross-Program Invocation (CPI)

### Secure CPI Pattern

```rust
// Invoking external program
pub fn deposit_to_external_protocol(ctx: Context<ExternalDeposit>, amount: u64) -> Result<()> {
    let cpi_accounts = OtherProgram::ExternalDeposit {
        user: ctx.accounts.user.to_account_info(),
        pool: ctx.accounts.pool.to_account_info(),
        token_account: ctx.accounts.token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    // Create a PDA signer for the CPI
    let seeds = &[
        b"authority-seed",
        ctx.accounts.user.key().as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer_seeds = &[&seeds[..]];

    // Execute the CPI with restricted permissions
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.external_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    other_program::cpi::external_deposit(cpi_ctx, amount)
}
```

## 🧪 Testing Excellence

### Unit Testing Framework

```rust
#[tokio::test]
async fn test_initialize() {
    let (mut banks_client, payer, recent_blockhash) = program_test().start().await;

    // Create program accounts
    let authority = Keypair::new();
    let (my_account, bump) = Pubkey::find_program_address(
        &[b"my-account", authority.pubkey().as_ref()],
        &program_id(),
    );

    // Build transaction
    let mut transaction = Transaction::new_with_payer(
        &[Instruction {
            program_id: program_id(),
            accounts: vec![
                AccountMeta::new(my_account, false),
                AccountMeta::new(authority.pubkey(), true),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: instruction::Initialize {
                data: InitializeParams { value: 100 },
            }
            .data(),
        }],
        Some(&payer.pubkey()),
    );

    transaction.sign(&[&payer, &authority], recent_blockhash);

    // Execute transaction
    banks_client.process_transaction(transaction).await.unwrap();

    // Verify account data
    let account = banks_client
        .get_account(my_account)
        .await
        .unwrap()
        .unwrap();
    let my_account_data: MyAccount =
        try_from_slice_unchecked(&account.data).unwrap();

    assert_eq!(my_account_data.authority, authority.pubkey());
    assert_eq!(my_account_data.value, 100);
}
```

### Property-Based Testing

```rust
proptest! {
    #[test]
    fn test_deposit_amount_range(amount in 1..10000u64) {
        let mut program_test = ProgramTest::new(
            "my_program",
            program_id(),
            processor!(process_instruction),
        );

        // Setup test environment...

        // Test deposit with different amounts
        assert!(result.is_ok());

        // Verify expected state changes...
    }
}
```

## 📱 Client Integration

### Web3.js Integration

```typescript
// Typescript function to initialize an account
export async function initializeAccount(
  connection: Connection,
  payer: Keypair,
  initialValue: number
): Promise<PublicKey> {
  const program = new Program(IDL, PROGRAM_ID, {
    connection,
    publicKey: payer.publicKey,
    signTransaction: null,
    signAllTransactions: null,
  });

  // Derive PDA for the new account
  const [myAccount, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("my-account"),
      payer.publicKey.toBuffer(),
    ],
    program.programId
  );

  // Send transaction
  await program.methods
    .initialize({ value: new BN(initialValue) })
    .accounts({
      myAccount,
      authority: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([payer])
    .rpc({ commitment: "confirmed" });

  return myAccount;
}
```

### Error Handling in Client Code

```typescript
try {
  await program.methods
    .processTransaction(amount)
    .accounts({...})
    .rpc();
} catch (error) {
  // Parse anchor error
  if (error instanceof AnchorError) {
    const errorCode = error.error.errorCode.code;
    if (errorCode === 'InvalidAmount') {
      console.error("Amount cannot be zero");
    } else if (errorCode === 'InsufficientFunds') {
      console.error("Not enough funds to complete transaction");
    } else {
      console.error(`Unexpected error: ${errorCode}`);
    }
  } else {
    console.error("Transaction failed:", error);
  }
}
```

## 🔄 Program Upgrades & Governance

### Upgradeable Programs

```rust
// Program upgrade authority
#[account(
    mut,
    constraint = program_data.upgrade_authority_address == Some(upgrade_authority.key())
)]
pub program_data: Account<'info, ProgramData>,
pub upgrade_authority: Signer<'info>,
```

### Program Governance

```rust
// Simple DAO voting mechanism for program upgrades
pub fn propose_upgrade(ctx: Context<ProposeUpgrade>, buffer: Pubkey) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    proposal.buffer = buffer;
    proposal.votes_for = 0;
    proposal.votes_against = 0;
    proposal.voters = vec![];
    proposal.executed = false;
    proposal.expires_at = Clock::get()?.slot + 1000; // ~1 hour

    Ok(())
}

pub fn vote(ctx: Context<Vote>, approve: bool) -> Result<()> {
    // Voting logic
    // ...
}

pub fn execute_upgrade(ctx: Context<ExecuteUpgrade>) -> Result<()> {
    // Check votes threshold reached
    require!(
        ctx.accounts.proposal.votes_for > ctx.accounts.dao.total_members / 2,
        ErrorCode::InsufficientVotes
    );

    // Perform upgrade via BPFLoaderUpgradeable
    // ...

    Ok(())
}
```

## 📊 Monitoring & Analytics

### On-chain Logging

```rust
// Use structured logging for indexing
emit!(TransactionExecuted {
    user: ctx.accounts.user.key(),
    action: "deposit".to_string(),
    amount: amount,
    timestamp: Clock::get()?.unix_timestamp,
});
```

### Program Health Metrics

```rust
// Update metrics for program monitoring
ctx.accounts.program_metrics.total_transactions += 1;
ctx.accounts.program_metrics.total_volume = ctx
    .accounts.program_metrics.total_volume
    .checked_add(amount)
    .ok_or(ErrorCode::MathOverflow)?;
```

## 🐞 Debugging Techniques

### Error Codes & Messages

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Insufficient funds in user account")]
    InsufficientFunds,

    #[msg("Account does not have required authority")]
    Unauthorized,

    #[msg("Pool is currently locked for another operation")]
    PoolLocked,

    #[msg("Operation timeout - try again")]
    OperationTimeout,
}
```

### Detailed Logging

```rust
msg!("Processing deposit: {} lamports from {}",
    amount,
    ctx.accounts.user.key().to_string()
);

// Log error details in complex scenarios
if Clock::get()?.unix_timestamp < expiry_timestamp {
    msg!("Expired: current={}, expiry={}",
        Clock::get()?.unix_timestamp,
        expiry_timestamp
    );
    return err!(ErrorCode::OperationTimeout);
}
```

## 🌐 Advanced Integration Patterns

### Metaplex NFT Integration

```rust
// Mint NFT with Metaplex
pub fn mint_nft(ctx: Context<MintNFT>, metadata_uri: String) -> Result<()> {
    // Create metadata account
    let cpi_accounts = MintMetadata {
        metadata: ctx.accounts.metadata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        mint_authority: ctx.accounts.authority.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        update_authority: ctx.accounts.authority.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        cpi_accounts,
    );

    create_metadata_accounts_v2(
        cpi_ctx,
        "My NFT Collection".to_string(),
        "MYNFT".to_string(),
        metadata_uri,
        Some(ctx.accounts.authority.key()),
        1, // creator share
        true, // is mutable
        false, // update authority is signer
        None, // collection
        None, // uses
    )?;

    // Mint the NFT token
    anchor_spl::token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        1,
    )?;

    Ok(())
}
```

### Oracle Integration

```rust
// Consuming Pyth price oracle data
pub fn process_with_price_oracle(ctx: Context<OracleContext>, amount: u64) -> Result<()> {
    // Load price feed account data
    let price_account_info = &ctx.accounts.price_feed;
    let price_data = price_account_info.try_borrow_data()?;
    let price = pyth_client::cast::<pyth_client::Price>(&price_data);

    // Validate price confidence and staleness
    let current_timestamp = Clock::get()?.unix_timestamp;
    let price_timestamp = price.publish_time;

    require!(
        current_timestamp - price_timestamp < 60, // 1 minute max staleness
        ErrorCode::StaleOracleData
    );

    require!(
        price.conf < price.price / 100, // 1% max confidence interval
        ErrorCode::PriceConfidenceTooLow
    );

    // Use price in safe way (handle negative prices)
    let price_value = price.price;
    require!(price_value > 0, ErrorCode::InvalidPrice);

    // Calculate USD value using the price
    let usd_value = amount
        .checked_mul(price_value as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10u64.pow(price.expo.abs() as u32))
        .ok_or(ErrorCode::MathOverflow)?;

    // Continue with logic using usd_value

    Ok(())
}
```

## 🚨 Common Gotchas & Solutions

### Account Size Limits

```rust
// ❌ Problem: Account too large error (10MB maximum)
pub struct LargeAccount {
    data: [u8; 11_000_000], // Will fail with "account too large"
}

// ✅ Solution: Split into multiple accounts with pagination
pub struct DataHeader {
    total_chunks: u16,
    content_length: u32,
    content_hash: [u8; 32], // Hash of entire content for verification
}

pub struct DataChunk {
    header: Pubkey,     // Reference to header account
    chunk_index: u16,
    data: [u8; 10_000], // Manageable chunk size
}
```

### Transaction Size Limits

```rust
// ❌ Problem: Transaction too large (1232 bytes maximum)
// Creating many accounts or passing large instruction data

// ✅ Solution: Split into multiple transactions
async function processBulkOperationSafely(items) {
  // Group items into batches of an appropriate size
  const batches = chunk(items, 5);

  for (const batch of batches) {
    const transaction = new Transaction();

    // Add instructions for this batch only
    for (const item of batch) {
      transaction.add(createInstructionForItem(item));
    }

    // Process batch transaction
    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }
}
```

### Ownership Confusion

```rust
// ❌ Problem: Forgotten ownership checks
pub fn insecure_withdraw(ctx: Context<Withdraw>) -> Result<()> {
    // Anyone could pass any account here!
    let from_account = &ctx.accounts.from;
    // ... transfer funds without checking ownership
}

// ✅ Solution: Validate ownership explicitly
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub from: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    // ... other accounts
}
```

## 📚 Project Structure Best Practices

### Anchor.toml Configuration

```toml
[features]
seeds = true                  # Enable automatic seed derivation
skip-lint = false             # Always enable linting
[programs.localnet]
my_program = "Abc123..."

[registry]
url = "https://anchor.projectserum.com"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Program File Organization

```
program/
├── src/
│   ├── instructions/         # Group instructions logically
│   │   ├── mod.rs           # Re-export instruction modules
│   │   ├── initialize.rs    # Individual instruction logic
│   │   └── process_txn.rs   # Individual instruction logic
│   ├── state/               # Account definitions
│   │   ├── mod.rs
│   │   └── user.rs
│   ├── utils/               # Shared utilities
│   │   ├── mod.rs
│   │   ├── validation.rs
│   │   └── math.rs
│   ├── errors.rs            # Centralized error definitions
│   └── lib.rs               # Program entrypoint
└── Cargo.toml
```

### Composable Program Design

```rust
// Program that can be composed by other programs
#[program]
pub mod composable_escrow {
    use super::*;

    // CPI-friendly instruction that other programs can call
    pub fn initialize(ctx: Context<Initialize>, amount: u64, unlock_time: i64) -> Result<()> {
        // Logic for initialization...
        Ok(())
    }

    // CPI function for other programs to use
    pub fn release_tokens(ctx: Context<Release>) -> Result<()> {
        // Logic for releasing tokens...
        Ok(())
    }
}

// CPI function in another program
pub fn my_program_release_escrow(ctx: Context<MyContext>) -> Result<()> {
    // Call into the escrow program
    let cpi_program = ctx.accounts.escrow_program.to_account_info();
    let cpi_accounts = escrow::cpi::accounts::Release {
        escrow: ctx.accounts.escrow.to_account_info(),
        signer: ctx.accounts.user.to_account_info(),
        destination: ctx.accounts.user_token.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    // Execute the CPI
    escrow::cpi::release_tokens(CpiContext::new(cpi_program, cpi_accounts))
}
```
