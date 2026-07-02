# Academic Statistical Pipeline (R)

This folder contains the standalone statistical analysis pipeline written in R, conforming to academic standards for thesis and statistical reporting.

## What is Included

The R script (`academic_pipeline.R`) performs the following statistical procedures:

1. **Data Cleaning**:
   - Imputes or removes missing values.
   - Detects and removes outliers using the **Interquartile Range (IQR)** method on core EEG channels (`Fp1`, `Cz`, `Fz`, `Pz`).
   - Standardizes data type casting (e.g., converts target label `Class` to factor).
   - Exports the clean dataset as `cleaned_data.csv`.
2. **Descriptive Statistics**:
   - Calculates five advanced metrics for continuous channels: **Mean**, **Median**, **Variance**, **Skewness**, and **Kurtosis**.
3. **Hypothesis Testing**:
   - **Independent t-test**: Compares the mean of continuous EEG signal amplitude (`Fp1`) across two binary groups (`ADHD` vs. `Control`).
   - **Chi-Square Test of Independence**: Examines the association between categorical binary target (`Class`) and discretized signal status (`High_Fp1`).
   - **One-Way ANOVA**: Compares the mean of continuous signal amplitude (`Pz`) across three distinct signal groups (`Cz` tertiles: Low, Mid, High).
4. **Simple Linear Regression**:
   - Fits a simple linear regression model predicting central channel activity (`Cz`) using frontal channel activity (`Fz`) as the independent predictor.

---

## How to Run the Script

### Prerequisites
Make sure you have **R** installed on your system. No additional packages are strictly required as all calculations (including skewness, kurtosis, and tests) are performed using base R statistical routines to avoid setup issues.

### Execution
Open your terminal inside this folder and run:
```bash
Rscript academic_pipeline.R
```
The script automatically finds the dataset `adhdata.csv` in either the current directory or the parent directory, processes the statistics, prints the report directly to the terminal, and exports the clean file `cleaned_data.csv`.
