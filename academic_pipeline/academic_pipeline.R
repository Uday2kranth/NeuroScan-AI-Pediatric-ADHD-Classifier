# ==============================================================================
# academic_pipeline.R
# Standalone R script for academic statistical analysis and baseline modeling.
# ==============================================================================

# Setup output formatting
options(scipen = 999)

# Helper function to compute skewness
compute_skewness <- function(x) {
  n <- length(x)
  if (n < 3) return(NA)
  mean_val <- mean(x, na.rm = TRUE)
  sd_val <- sd(x, na.rm = TRUE)
  sum((x - mean_val)^3) / ((n - 1) * sd_val^3)
}

# Helper function to compute excess kurtosis
compute_kurtosis <- function(x) {
  n <- length(x)
  if (n < 4) return(NA)
  mean_val <- mean(x, na.rm = TRUE)
  sd_val <- sd(x, na.rm = TRUE)
  (sum((x - mean_val)^4) / ((n - 1) * sd_val^4)) - 3
}

cat("==============================================================\n")
cat("Starting Academic Pipeline: R Statistical Analysis\n")
cat("==============================================================\n\n")

# ── 1. Data Loading ──────────────────────────────────────────────────────────
# Check current directory and parent directory for dataset
data_path <- "adhdata.csv"
if (!file.exists(data_path)) {
  data_path <- "../adhdata.csv"
}
if (!file.exists(data_path)) {
  stop("Error: Dataset 'adhdata.csv' not found in current or parent directory.")
}
cat("[R] Loading dataset from:", data_path, "...\n")
df <- read.csv(data_path)
cat("[R] Initial dimensions:", nrow(df), "rows,", ncol(df), "columns\n\n")

# ── 2. Data Cleaning ──────────────────────────────────────────────────────────
cat("[R] Step 1: Data Cleaning\n")

# Check for missing values
missing_count <- sum(is.na(df))
cat("  - Missing values found:", missing_count, "\n")
if (missing_count > 0) {
  df <- na.omit(df)
  cat("  - Removed rows with missing values. New row count:", nrow(df), "\n")
}

# Outlier removal via IQR method on continuous EEG channels (Fp1, Cz, Fz, Pz)
target_channels <- c("Fp1", "Cz", "Fz", "Pz")
clean_df <- df

for (channel in target_channels) {
  if (channel %in% colnames(clean_df)) {
    q25 <- quantile(clean_df[[channel]], 0.25, na.rm = TRUE)
    q75 <- quantile(clean_df[[channel]], 0.75, na.rm = TRUE)
    iqr <- q75 - q25
    lower_bound <- q25 - 1.5 * iqr
    upper_bound <- q75 + 1.5 * iqr
    
    # Filter rows within bounds
    clean_df <- clean_df[clean_df[[channel]] >= lower_bound & clean_df[[channel]] <= upper_bound, ]
  }
}
cat("  - Outlier detection (IQR) complete on key channels:", paste(target_channels, collapse = ", "), "\n")
cat("  - Dimensions after outlier cleaning:", nrow(clean_df), "rows,", ncol(clean_df), "columns\n")

# Type casting target variable and identifier
clean_df$Class <- as.factor(clean_df$Class)
clean_df$ID <- as.factor(clean_df$ID)
cat("  - Variable type casting: 'Class' cast to factor, 'ID' cast to factor.\n")

# Save cleaned data in same directory
write.csv(clean_df, "cleaned_data.csv", row.names = FALSE)
cat("  - Cleaned dataset saved to 'cleaned_data.csv'\n\n")

# ── 3. Descriptive Statistics ────────────────────────────────────────────────
cat("[R] Step 2: Descriptive Statistics (Five Advanced Metrics)\n")
stats_table <- data.frame(
  Channel = target_channels,
  Mean = sapply(target_channels, function(ch) mean(clean_df[[ch]])),
  Median = sapply(target_channels, function(ch) median(clean_df[[ch]])),
  Variance = sapply(target_channels, function(ch) var(clean_df[[ch]])),
  Skewness = sapply(target_channels, function(ch) compute_skewness(clean_df[[ch]])),
  Kurtosis = sapply(target_channels, function(ch) compute_kurtosis(clean_df[[ch]]))
)
print(stats_table)
cat("\n")

# ── 4. Hypothesis Testing (Three Distinct Types) ─────────────────────────────
cat("[R] Step 3: Hypothesis Testing\n")

# -- Test A: Independent t-test (Continuous feature vs. Binary target)
# Compare Fp1 channel values between ADHD and Control groups
cat("\n--- Test A: Independent Two-Sample t-test ---\n")
cat("Null Hypothesis (H0): Mean Fp1 value is equal between ADHD and Control subjects.\n")
t_test_result <- t.test(Fp1 ~ Class, data = clean_df)
print(t_test_result)

# -- Test B: Chi-Square Test of Independence (Categorical vs. Categorical)
# Create a dummy categorical variable: High_Fp1 (True if Fp1 > median)
cat("\n--- Test B: Chi-Square Test of Independence ---\n")
cat("Null Hypothesis (H0): High_Fp1 status is independent of the subject class (ADHD vs Control).\n")
median_fp1 <- median(clean_df$Fp1)
clean_df$High_Fp1 <- ifelse(clean_df$Fp1 > median_fp1, "High", "Low")
contingency_table <- table(clean_df$High_Fp1, clean_df$Class)
print(contingency_table)
chisq_result <- chisq.test(contingency_table)
print(chisq_result)

# -- Test C: One-Way ANOVA (Continuous target vs. Multi-class predictor)
# Create a multi-class categorical variable from 'Cz' tertiles to predict 'Pz' values
cat("\n--- Test C: One-Way ANOVA ---\n")
cat("Null Hypothesis (H0): Mean Pz value is equal across all Cz Tertiles (Low, Mid, High).\n")
cz_quantiles <- quantile(clean_df$Cz, probs = c(0, 1/3, 2/3, 1))
clean_df$Cz_Tertile <- cut(clean_df$Cz, breaks = cz_quantiles, include.lowest = TRUE, labels = c("Low", "Mid", "High"))
anova_model <- aov(Pz ~ Cz_Tertile, data = clean_df)
anova_result <- summary(anova_model)
print(anova_result)

# ── 5. Simple Linear Regression ──────────────────────────────────────────────
cat("\n[R] Step 4: Simple Linear Regression\n")
cat("Regressing Cz (continuous) on Fz (continuous predictor):\n")
lm_model <- lm(Cz ~ Fz, data = clean_df)
lm_summary <- summary(lm_model)
print(lm_summary)

cat("\n==============================================================\n")
cat("Academic Pipeline (R) Complete.\n")
cat("==============================================================\n")
