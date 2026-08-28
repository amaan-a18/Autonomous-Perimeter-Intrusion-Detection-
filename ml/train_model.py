"""
train_model.py

Trains a Random Forest classifier on MFCC features extracted from the
dataset, evaluates it, and saves the model + label encoder for use by
backend/simulator.py and backend/live_classifier.py.

Usage:
    python train_model.py --data ../dataset/data --out ./model
"""

import argparse
import os
import json
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

from feature_extraction import build_dataset


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="../dataset/data")
    parser.add_argument("--out", default="./model")
    parser.add_argument("--test_size", type=float, default=0.2)
    parser.add_argument("--n_estimators", type=int, default=200)
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    print("Extracting features from:", args.data)
    X, y, labels = build_dataset(args.data)
    print(f"Dataset: {X.shape[0]} clips, {X.shape[1]} features, classes={labels}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=args.n_estimators, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest accuracy: {acc:.3f}\n")
    print("Classification report:")
    print(classification_report(y_test, y_pred, target_names=labels))
    print("Confusion matrix (rows=true, cols=predicted):")
    print(labels)
    print(confusion_matrix(y_test, y_pred))

    model_path = os.path.join(args.out, "model.pkl")
    labels_path = os.path.join(args.out, "labels.json")
    joblib.dump(clf, model_path)
    with open(labels_path, "w") as f:
        json.dump(labels, f)

    print(f"\nSaved model to {model_path}")
    print(f"Saved label list to {labels_path}")


if __name__ == "__main__":
    main()
