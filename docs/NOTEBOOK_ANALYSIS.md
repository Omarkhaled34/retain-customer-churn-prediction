# Notebook analysis and refactoring decisions

Source: `../math_ml/customer churn.ipynb`. Cell references below are zero-based JSON cell indices. The notebook was inspected before implementation.

## What the notebook actually does

1. Cell 1 loads `C:/Users/MAREY/Downloads/archive (1)/customer_churn_dataset-training-master.csv`. This file was found and used. Its SHA-256 is `a41be7b96fb85110521bf03d1530879e9ca94b9f5de19866757f6d184300fff7`.
2. The raw training data has 440,833 rows and 12 columns. Cell 6 drops missing rows; the cleaned dataset has 440,832 complete observations. One incomplete row was removed in the refactored training job.
3. Cells 10–11 remove CustomerID and Churn from an exploratory numeric list. This list is used for plots, not final feature selection.
4. Cell 26 creates `x` by dropping only Churn, thereby retaining CustomerID. Cell 27 uses `train_test_split(test_size=.2, random_state=42)` without stratification.
5. Cell 28 fits `OrdinalEncoder` on training categories only and transforms validation. This is already free of validation leakage; the refactor preserves that behavior.
6. Cell 30 redefines numerical columns to include CustomerID, despite the comment `# no CustomerID`. Its `StandardScaler` is fitted on training only. Validation is only transformed.
7. Cells 34–35 train the default LogisticRegression. The notebook reports validation accuracy 0.9775426179863214 and training accuracy 0.9775877957835339. The comparison refit reproduces the validation accuracy exactly.
8. Cell 39 loads the separate testing CSV, with 64,374 rows. Cells 45 and 49 transform it with the saved-in-memory encoder and scaler. The notebook ends after showing transformed `test_x`; it does not contain a final independent test accuracy calculation or saved model artifact.

## Deliberate implementation changes

- Exclude CustomerID from all served training/inference. All 440,832 cleaned identifiers are unique. A sequential key is not a customer behavior feature. It can carry information about how this dataset was assembled and ordered. It remains a string identifier in the database and CSV exports.
- Preserve the notebook's 80/20 split seed and unstratified methodology for a useful comparison. Remove the identifier consistently before fitting and inference.
- Use one `Pipeline` containing a `ColumnTransformer` and LogisticRegression. The transformer selects seven numeric and three categorical columns by name. Numeric/categorical concatenation order differs internally from the notebook, but training and inference use the exact same saved order; column permutation itself does not change the logistic regression problem.
- Fit StandardScaler and OrdinalEncoder only on the training partition. No leakage fix was needed for this aspect of the notebook. No inference code calls fit.
- Increase `max_iter` to 1,000 to allow convergence. The logistic regression objective and default decision threshold remain unchanged.
- Reject missing/nonfinite numerical values and unknown categories at the API boundary. The notebook dropped incomplete training rows; the web app does not silently impute customer data or encode unobserved categories as a meaningful category.
- Preserve float spending values and require integer count/day fields. Serialize the preprocessing and classifier with the real metadata in one artifact. The service reindexes by the shared canonical feature list and locates churn class `1` in `classes_`.
- Evaluate precision, recall, F1, ROC-AUC and confusion matrices using held-out data. No score is inferred from notebook screenshots. The separate testing CSV is only evaluated after fitting and is never used to tune the model.
- Apply documented operational probability bands of 0.40 and 0.70. They are not validated business thresholds. Binary labels still come from the trained classifier.

## Measured impact

The notebook-style identifier comparison has 97.75% validation accuracy. The production pipeline without the identifier has 85.04% validation accuracy and 58.69% independent test accuracy. Validation and test ROC-AUC are 92.84% and 77.58%, respectively. Full-precision values and confusion matrices are stored in the generated metadata.

The independent test set is substantially more difficult for this model. The test false-positive count is 26,068, versus 7,813 true negatives. This requires representative evaluation and a retention-cost analysis before acting on scores. Nothing in the app claims that a high validation score makes individual probabilities calibrated or guarantees future behavior.

## Architectural boundaries

`ml/train.py` performs offline fitting. `ml/evaluate.py` evaluates fitted pipelines. `ml/schema.py` defines the API-to-notebook feature mapping. `prediction/services/predictor.py` validates the trained vocabulary and performs cached inference. Serializers enforce input structure and sensible bounds. Prediction persistence uses exclusive input snapshots and transactions. User-scoped querysets power history, exports and analytics. The frontend never loads Joblib or Scikit-learn.

## References

The pipeline and train-only fitting follow the [Scikit-learn preprocessing and leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html). Session handling follows [Django REST Framework's session authentication and CSRF requirements](https://www.django-rest-framework.org/api-guide/authentication/#sessionauthentication), including explicit protection for anonymous login/registration requests.
