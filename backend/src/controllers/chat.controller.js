const Conversation = require("../models/Conversation");

const serializeParticipant = (participant) => ({
  _id: participant?._id,
  name: participant?.name || "",
  email: participant?.email || "",
  role: participant?.role || "user"
});

const serializeItem = (item) => ({
  _id: item?._id,
  title: item?.title || "Item",
  images: Array.isArray(item?.images) ? item.images.filter(Boolean) : [],
  pricePerDay: item?.pricePerDay || 0,
  category: item?.category || ""
});

exports.getMyChats = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ owner: req.user.id }, { renter: req.user.id }]
    })
      .populate("item", "title images pricePerDay category")
      .populate("owner", "name email role")
      .populate("renter", "name email role")
      .populate("messages.sender", "name email role")
      .sort({ lastMessageAt: -1 });

    const threads = conversations.map((conversation) => {
      const owner = serializeParticipant(conversation.owner);
      const renter = serializeParticipant(conversation.renter);
      const item = serializeItem(conversation.item);
      const isOwner = String(conversation.owner?._id) === String(req.user.id);
      const counterpart = isOwner ? renter : owner;
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const lastEntry = messages[messages.length - 1] || null;

      return {
        threadId: conversation._id,
        itemId: conversation.item?._id || conversation.item || null,
        rentalId: conversation.rental || null,
        lastMessageAt: conversation.lastMessageAt,
        messageCount: messages.length,
        item,
        owner,
        renter,
        counterpart,
        preview: lastEntry
          ? {
              message: lastEntry.message,
              createdAt: lastEntry.createdAt,
              sender: serializeParticipant(lastEntry.sender)
            }
          : null,
        hasMessages: messages.length > 0
      };
    });

    res.json({ threads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};