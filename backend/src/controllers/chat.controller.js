const Conversation = require("../models/Conversation");

const serializeParticipant = (participant) => ({
  _id: participant?._id,
  name: participant?.name || "",
  email: participant?.email || "",
  profileImage: participant?.profileImage || "",
  role: participant?.role || "user"
});

const serializeItem = (item) => ({
  _id: item?._id,
  title: item?.title || "Item",
  images: Array.isArray(item?.images) ? item.images.filter(Boolean) : [],
  pricePerDay: item?.pricePerDay || 0,
  category: item?.category || ""
});

const getUnreadCount = (conversation, viewerId, isOwner) => {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const lastSeenAt = isOwner ? conversation.ownerLastSeenAt : conversation.renterLastSeenAt;

  return messages.reduce((count, entry) => {
    const senderId = entry?.sender?._id || entry?.sender;
    if (!senderId) return count;
    if (String(senderId) === String(viewerId)) return count;
    if (!lastSeenAt) return count + 1;
    return new Date(entry.createdAt) > new Date(lastSeenAt) ? count + 1 : count;
  }, 0);
};

exports.getMyChats = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ owner: req.user.id }, { renter: req.user.id }]
    })
      .populate("item", "title images pricePerDay category")
      .populate("owner", "name email profileImage role")
      .populate("renter", "name email profileImage role")
      .populate("messages.sender", "name email profileImage role")
      .sort({ lastMessageAt: -1 });

    const threads = conversations.map((conversation) => {
      const owner = serializeParticipant(conversation.owner);
      const renter = serializeParticipant(conversation.renter);
      const item = serializeItem(conversation.item);
      const isOwner = String(conversation.owner?._id) === String(req.user.id);
      const counterpart = isOwner ? renter : owner;
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const lastEntry = messages[messages.length - 1] || null;
      const unreadCount = getUnreadCount(conversation, req.user.id, isOwner);

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
        hasMessages: messages.length > 0,
        unreadCount,
        hasUnread: unreadCount > 0
      };
    });

    res.json({ threads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markThreadSeen = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.threadId);
    if (!conversation) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isOwner = String(conversation.owner) === String(req.user.id);
    const isRenter = String(conversation.renter) === String(req.user.id);

    if (!isOwner && !isRenter) {
      return res.status(403).json({ message: "Not allowed to update this thread" });
    }

    const seenAt = new Date();
    if (isOwner) {
      conversation.ownerLastSeenAt = seenAt;
    } else {
      conversation.renterLastSeenAt = seenAt;
    }

    await conversation.save();
    res.json({ message: "Thread marked as seen", threadId: conversation._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};