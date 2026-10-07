# Zerocode---IIT-Bombay
My submission for the ZeroCode Vibe Coding Challenge by Techfest, IIT Bombay.


# Bill Splitter

A responsive bill-splitting web application created for the **ZeroCode competition by Techfest, IIT Bombay**.

The application helps groups divide a bill fairly by considering common consumption items, individual consumption items, the people involved, and the price of each item.

## Features

- Enter an occasion name.
- Add the total bill amount.
- Add the number of people.
- Enter the names of all participants.
- Add common consumption items.
- Add individual consumption items.
- Assign an individual item to the person who consumed it.
- Enter the price of every item.
- Calculate each person’s share.
- Display a clear payment breakdown.
- Ensure that the total of all shares matches the bill amount.
- Validate empty, zero, negative, and invalid inputs.
- Preserve the result after refreshing the page.
- Responsive layout for mobile, tablet, and desktop screens.
- Built without frameworks, libraries, or external APIs.

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Browser Local Storage

## Project Files

```text
.
├── README.md
├── ZC-9A1FBC7369AA_index.html
├── ZC-9A1FBC7369AA_style.css
└── ZC-9A1FBC7369AA_script.js
```


```text
ZC-9A1FBC7369AA_index.html
```

The application works directly in the browser using the `file://` protocol.

## How to Use

1. Enter the occasion name.
2. Enter the bill amount.
3. Enter the number of people.
4. Add the name of each person.
5. Add the consumption items.
6. Select whether each item is common or individual.
7. For an individual item, select the person who consumed it.
8. Enter the item price.
9. Click the calculate button.
10. Review the amount payable by each person.

## Example

### People

```text
Ramesh
Rahul
Aditya
Aman
```

### Items

```text
Dessert — ₹250 — Individual — Rahul
Drinks — ₹650 — Common
Dinner — ₹2,775 — Common
```

The application calculates each person’s amount and displays a final breakdown. The displayed shares are adjusted and rounded so that their total matches the bill exactly.

## Validation

The application checks for:

- Empty occasion names.
- Empty bill amounts.
- Zero or negative bill amounts.
- Invalid decimal values.
- Empty or duplicate person names.
- Missing item names.
- Missing item prices.
- Invalid or negative item prices.
- Missing person assignments for individual items.

Error messages are displayed clearly so that users can correct their input before calculating the bill.

## Responsive Design

The interface is designed to work across different screen sizes, including:

- Mobile phones.
- Tablets.
- Laptops.
- Desktop monitors.

The layout uses responsive CSS, Flexbox, and CSS Grid.

## Browser Compatibility

The application is intended to work in modern browsers, including:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox.
- Safari.

## Competition

This project was created for the **ZeroCode competition** conducted by **Techfest, IIT Bombay**.

## Author

Created by **Jorwar Dhiraj**.

## License

This project is created for educational and competition purposes.