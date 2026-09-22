import axios from 'axios';

const GIST_DESCRIPTION = "CodePocket Sync Data";
const GIST_FILENAME_INDEX = "index.json";

export const GithubService = {

    async getGist(token) {
        // 1. List user's gists to find the one with specific description
        const response = await axios.get('https://api.github.com/gists', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            params: {
                per_page: 100 // Hopefully the user doesn't have too many gists or we find it in the first page
            }
        });

        return response.data.find(g => g.description === GIST_DESCRIPTION);
    },

    async createGist(token, files) {
        const response = await axios.post('https://api.github.com/gists', {
            description: GIST_DESCRIPTION,
            public: false,
            files: files
        }, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    },

    async updateGist(token, gistId, files) {
        const response = await axios.patch(`https://api.github.com/gists/${gistId}`, {
            files: files
        }, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    },

    async getGistDetail(token, gistId) {
        const response = await axios.get(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    },

    // Helper to prepare files payload from Snippets
    prepareGistFiles(snippets) {
        const files = {};
        const indexData = [];

        snippets.forEach(s => {
            // Index only keeps metadata
            indexData.push({
                uuid: s.uuid,
                title: s.title,
                tags: s.tags,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt
            });

            // Content goes into separate files
            // filename: uuid.html
            const filename = `${s.uuid}.html`;
            files[filename] = {
                content: s.content || "<!-- Empty -->"
            };
        });

        // Add index.json
        files[GIST_FILENAME_INDEX] = {
            content: JSON.stringify(indexData, null, 2)
        };

        return files;
    }
};
