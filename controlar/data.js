const Rpage = require('../models/pageData');
const ImageTopCarousel = require('../models/imageTopCarousel');
const Team = require("../models/Team.js");
const ContacPage=require("../models/ContacPageModel.js")


exports.contacpageCreate=async(req,res)=>{
   try{
      const {title,content,public_id}=req.body;
      const newcontacpage = new ContacPage({
        title,
        content,
        image: {
          url: `data:image/png;base64,${public_id}`,
          public_id,
        }
      });
      await newcontacpage.save();

      return res.status(201).json({ message: 'Page data added successfully' });
   }catch(err){
    console.log("err")
   }
}
exports.contacpageData=async(req,res)=>{
    try {
        // Find all contacpages and sort them in descending order by _id
        let contacpages = await ContacPage.find().sort({ _id: -1 }).limit(1);
    
        return res.status(200).json({ contacpages });
    
      } catch (err) {
        console.error("Error fetching data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
}



exports.registerPage = async (req, res) => {
    try {
        const { Address, Contactinfo, timeSchedule, title, subtitle } = req.body;
        const newRegistration = new Rpage({
            Address,
            Contactinfo,
            timeSchedule,
            title,
            subtitle
        });
        await newRegistration.save();
        return res.status(201).json({ message: 'Page data added successfully' });
    } catch (error) {
        console.error('Error adding subscriber:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.registerPageDataUpdate = async (req, res) => {
    try {
        const { Address, Contactinfo, timeSchedule, title, subtitle } = req.body;
        // update data
        const updatedPageData = await Rpage.findOneAndUpdate(
            { /* Your query criteria */ },
            {
                $set: {
                    Address,
                    ContactInfo: Contactinfo,
                    TimeSchedule: timeSchedule,
                    title: req.body.title,
                    subtitle: req.body.subtitle
                },
            },
            { new: true }
        );

        if (!updatedPageData) {
            return res.status(404).json({ error: 'Page data not found' });
        }

        return res.status(200).json({ message: 'Page data updated successfully', updatedPageData });
    } catch (error) {
        console.error('Error updating page data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.registerPageData = async (req, res) => {
    try {
        // Implement the logic to retrieve page data
        // You can query the database using the Rpage model and send the data in the response
        const pageData = await Rpage.find();
        return res.status(200).json({ pageData });
    } catch (error) {
        console.error('Error fetching page data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.topCarusel = async (req, res) => {
    try { } catch (err) {
        console.error('Error fetching page data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ... other functions ...

exports.topCaruselDataCreate = async (req, res) => {
    try {
        const { image } = req.body;

        // Check if there's an existing top carousel image
        let existingTopImage = await ImageTopCarousel.findOne();

        if (existingTopImage) {
            // Update the existing image
            existingTopImage.image = image;
            await existingTopImage.save();
            return res.status(200).json({ message: 'Top carousel image updated successfully', image: existingTopImage });
        } else {
            // If no existing image, create a new one
            let topImage = new ImageTopCarousel({ image });
            await topImage.save();
            return res.status(201).json({ message: 'Top carousel image created successfully', image: topImage });
        }
    } catch (err) {
        console.error('Error updating/creating top carousel image:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getTopCaruselImage = async (req, res) => {
    try {
        // Find the top carousel image
        const topImage = await ImageTopCarousel.findOne();

        if (!topImage) {
            return res.status(404).json({ error: 'Top carousel image not found' });
        }

        return res.status(200).json({ image: topImage.image });
    } catch (error) {
        console.error('Error fetching top carousel image:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
// team:

exports.createTeam = async (req, res) => {
    const { designation, name, public_id, } = req.body;
    try {
        // Create a new blog and associate it with the authenticated user
        const newTeam = new Team({
            name,
            designation,
            author: req.user._id,
        });
        newTeam.image = {
            url: `data:image/png;base64,${public_id}`,
            public_id,
        };
        await newTeam.save();

        // Use populate to fetch details of the author and attach them to the blog
        const populatedTeam = await newTeam.populate('author', 'name email image')

        res.status(201).json({ message: 'Team Member created successfully', team:populatedTeam  });
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
// 
exports.allTeam = async (req, res) => {
    try {
        // Find all blogs with status 'draft'
        const team = await Team.find()
            .populate('author', 'name email'); // Populate the 'author' field with user details
        res.status(200).json({ team });
    } catch (error) {
        console.error('Error getting All  Team Member:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.deleteSingeteam = async (req, res) => {
    const teamId = req.params._id; // Assuming team ID is passed as a route parameter
console.log(teamId)
    try {
        // Find the team member by ID and remove it
        const deletedTeam = await Team.findOneAndDelete({ _id: teamId });

        if (!deletedTeam) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        res.status(200).json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
