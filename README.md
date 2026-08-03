# Derma Quiz

Mobile-first εκπαιδευτικό quiz για επιστημονικούς συνεργάτες. Η αρχική βάση
περιλαμβάνει 40 ερωτήσεις SELGAMIS®.

## Τι περιλαμβάνει

- Τυχαία επιλογή ερωτήσεων και απαντήσεων
- Φίλτρα ανά brand και ενότητα
- Άμεση εμφάνιση σωστής απάντησης και επεξήγησης
- Τελικό σκορ και επανάληψη μόνο των λαθών
- Mobile Safari / Chrome friendly σχεδιασμό
- Τοπική αποθήκευση καλύτερου σκορ
- Αυτόματο validation της βάσης
- Αυτόματο deployment μέσω GitHub Pages

## Πρώτη εγκατάσταση στο GitHub

1. Αποσυμπίεσε το ZIP.
2. Άνοιξε το repository `IoannisPharm/Derma-Quiz`.
3. Πήγαινε **Code → Add file → Upload files**.
4. Κάνε drag-and-drop **όλα τα περιεχόμενα** αυτού του φακέλου.
   - Πρέπει να ανέβει και ο φάκελος `.github`.
   - Μην ανεβάσεις το ZIP ως ZIP.
5. Στο commit message γράψε:
   `Add complete Derma Quiz project`
6. Επίλεξε **Commit directly to the main branch**.
7. Πάτησε **Commit changes**.
8. Πήγαινε **Settings → Pages**.
9. Στο **Build and deployment → Source** επίλεξε **GitHub Actions**.
10. Πήγαινε στην καρτέλα **Actions** και περίμενε να ολοκληρωθεί το
    `Validate and deploy Derma Quiz`.

Το site θα εμφανιστεί στη διεύθυνση:

`https://ioannispharm.github.io/Derma-Quiz/`

Αν το πρώτο deployment αποτύχει επειδή το Pages δεν είχε ενεργοποιηθεί ακόμη,
άνοιξε το αποτυχημένο workflow και πάτησε **Re-run all jobs**.

## Δομή αρχείων

```text
.
├── .github/
│   └── workflows/
│       └── pages.yml
├── data/
│   └── questions.json
├── scripts/
│   └── validate-questions.mjs
├── .nojekyll
├── app.js
├── index.html
├── package.json
├── README.md
└── styles.css
```

## Πώς προσθέτουμε νέα ερώτηση

Οι ερωτήσεις βρίσκονται στο `data/questions.json`.

Παράδειγμα:

```json
{
  "id": "SELGAMIS-041",
  "brand": "SELGAMIS",
  "section": "Product Knowledge",
  "type": "multiple-choice",
  "question": "Το κείμενο της ερώτησης",
  "options": ["Απάντηση A", "Απάντηση B", "Απάντηση C", "Απάντηση D"],
  "correctAnswer": "Απάντηση C",
  "explanation": "Σύντομη εξήγηση της σωστής απάντησης.",
  "source": "Source pending verification",
  "medicalReviewStatus": "pending-review",
  "medicalReviewDate": null,
  "enabled": true
}
```

Επιτρεπόμενοι τύποι:

- `multiple-choice`
- `true-false`
- `free-text`

Για `free-text` πρέπει να υπάρχει και:

```json
"acceptedAnswers": ["Απάντηση", "Εναλλακτική γραφή"]
```

## Επιστημονική έγκριση

Οι αρχικές ερωτήσεις έχουν:

```json
"medicalReviewStatus": "pending-review"
```

Μετά τον επιστημονικό έλεγχο άλλαξε την τιμή σε:

```json
"medicalReviewStatus": "approved",
"medicalReviewDate": "2026-08-03"
```

Το `medicalReviewStatus` είναι πεδίο εσωτερικής διαχείρισης και δεν αντικαθιστά
τις εταιρικές διαδικασίες Medical / Regulatory / Legal review.

## Αυτόματος έλεγχος

Σε κάθε αλλαγή το GitHub Actions ελέγχει ότι:

- δεν υπάρχουν διπλά IDs,
- δεν λείπουν υποχρεωτικά πεδία,
- η σωστή απάντηση υπάρχει στις επιλογές,
- οι free-text ερωτήσεις έχουν αποδεκτές απαντήσεις,
- το JSON είναι έγκυρο,
- κάθε approved ερώτηση έχει ημερομηνία ελέγχου,
- το `app.js` δεν έχει συντακτικό σφάλμα.

Αν ο έλεγχος αποτύχει, το site δεν δημοσιεύεται.

## Σημαντική επισήμανση

Πριν από επίσημη εταιρική χρήση, κάθε ερώτηση, απάντηση, ποσοστό, claim και
πηγή πρέπει να ελεγχθεί έναντι του ισχύοντος SPC/SmPC και των εγκεκριμένων
επιστημονικών/προωθητικών υλικών.
