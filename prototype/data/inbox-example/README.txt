Example folder for the inbox connector (node cli/inbox.js).

What is here
- 13 emails as .eml files and 2 texts as text-line webhook .json files. The file number is the
  number of the message in the case packet (data/packet.json): emails 1, 2, 37 to 40, 42 and 61
  to 66, texts 5 and 41. The text of each message is the packet's text, unchanged. Everything in
  the packet is fictional.
- sent.json: the two numbered messages of the firm that the two texts answer.
- hearings-rows.csv: columns A and B of the Hearings tab of the example gate sheet with the row
  number of each case, so that the list can name the row.

What was added to make files out of packet messages
- The packet gives each message a sender, a channel, the properties it is about and a text. It
  gives no subject, no time and no message number. The Subject line here is "Hearings:" followed
  by the packet's properties for that message. The Date is the simulated time from
  data/timeline.json. The Message-ID is made up from the packet number.
- The office and consultant addresses are the ones in the packet. The packet gives no address
  for the firm, so the firm appears by name only.
- The packet does not hold the firm's outgoing texts. The two entries in sent.json are written
  for this example in the form the Dockets tab writes them (see the note inside the file).
- The webhook format is not the format of a particular text service. The connector accepts the
  common field names; the firm's own service decides the real ones.

This folder is rebuilt from the packet by a small script that is not part of the prototype. Do
not edit the message texts by hand: the recorded answers of the AI readers are found by the text.
